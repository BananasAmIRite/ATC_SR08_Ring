import { GestureType, validateGesture } from './GestureValidator';
import { AccelDataPoint } from '../shared/plot';

export type GestureMode = 'continuous' | 'discrete';

export interface GestureConfig {
    mode: GestureMode;
    cooldownMs: number;
    minConfidence: number;
    // For continuous gestures: callback fires repeatedly while gesture is held
    // For discrete gestures: callback fires once, then cooldown applies
    onTrigger: () => void;
    // Optional: callback when continuous gesture ends
    onEnd?: () => void;
}

export interface ClassificationResult {
    label: string;
    confidence: number;
}

/**
 * GestureHandler manages continuous vs discrete gesture handling with cooldowns and validation.
 * Includes hysteresis to prevent oscillation between similar gestures.
 */
export class GestureHandler {
    private configs: Map<GestureType, GestureConfig> = new Map();
    private lastTriggerTime: Map<GestureType, number> = new Map();
    private activeGesture: GestureType | null = null;
    private activeGestureStartTime: number = 0;
    
    // For debouncing discrete gestures - require N consecutive detections
    private discreteDetectionBuffer: Map<GestureType, number> = new Map();
    private readonly discreteConfirmationCount = 2; // Require 2 consecutive detections

    // Hysteresis: track consecutive detections of a gesture to switch away from active
    private switchBuffer: { gesture: GestureType; count: number } | null = null;
    private readonly switchConfirmationCount = 4; // Need 4 consecutive different detections to switch
    private readonly switchConfidenceBoost = 0.1; // Require 10% higher confidence to switch

    // Grace period: allow this many low-confidence frames before ending a gesture
    private lowConfidenceCount = 0;
    private readonly endGracePeriod = 3; // Tolerate 3 low-confidence frames before ending

    constructor() {}

    /**
     * Register a gesture with its configuration.
     */
    registerGesture(gesture: GestureType, config: GestureConfig): void {
        this.configs.set(gesture, config);
        this.lastTriggerTime.set(gesture, 0);
        this.discreteDetectionBuffer.set(gesture, 0);
    }

    /**
     * Handle a classification result with gesture validation and cooldown logic.
     * @param results - Array of classification results sorted by confidence
     * @param segment - The accelerometer segment used for classification (for validation)
     */
    handleClassification(results: ClassificationResult[], segment: AccelDataPoint[]): void {
        if (!results || results.length === 0) return;

        const topResult = results[0];
        const gesture = topResult.label as GestureType;
        const config = this.configs.get(gesture);

        // If no config for this gesture, handle with grace period
        if (!config) {
            this.handleLowConfidenceOrInvalid();
            return;
        }

        // Check confidence threshold - but use grace period for active continuous gestures
        const activeConfig = this.activeGesture ? this.configs.get(this.activeGesture) : null;
        const isActiveGestureDetected = gesture === this.activeGesture;
        
        if (topResult.confidence < config.minConfidence) {
            // If we're detecting the SAME gesture as active but low confidence, use grace period
            if (isActiveGestureDetected && activeConfig?.mode === 'continuous') {
                this.handleLowConfidenceOrInvalid();
                return;
            }
            // Otherwise just reject non-active low-confidence detections
            this.handleLowConfidenceOrInvalid();
            this.resetDiscreteBuffer(gesture);
            return;
        }

        // Validate gesture characteristics
        if (!validateGesture(gesture, segment)) {
            this.handleLowConfidenceOrInvalid();
            this.resetDiscreteBuffer(gesture);
            return;
        }

        // Good detection - reset grace counter
        this.lowConfidenceCount = 0;
        const now = Date.now();

        if (config.mode === 'continuous') {
            this.handleContinuousGesture(gesture, config, now, topResult.confidence);
        } else {
            this.handleDiscreteGesture(gesture, config, now);
        }
    }

    /**
     * Handle low confidence or invalid detection with grace period for active gestures.
     */
    private handleLowConfidenceOrInvalid(): void {
        if (this.activeGesture) {
            const config = this.configs.get(this.activeGesture);
            if (config?.mode === 'continuous') {
                this.lowConfidenceCount++;
                // Continue triggering the active gesture during grace period
                if (this.lowConfidenceCount <= this.endGracePeriod) {
                    this.continueActiveGesture(Date.now());
                    return;
                }
            }
        }
        // Exceeded grace period or no active gesture
        this.endActiveGesture();
    }

    private handleContinuousGesture(gesture: GestureType, config: GestureConfig, now: number, confidence: number): void {
        // If we already have an active gesture
        if (this.activeGesture !== null && this.activeGesture !== gesture) {
            const activeConfig = this.configs.get(this.activeGesture);
            
            // Hysteresis: require higher confidence AND consecutive detections to switch
            const requiredConfidence = (activeConfig?.minConfidence || 0) + this.switchConfidenceBoost;
            
            if (confidence < requiredConfidence) {
                // Not confident enough to switch - continue with current gesture
                this.switchBuffer = null;
                this.continueActiveGesture(now);
                return;
            }
            
            // Track consecutive detections of this new gesture
            if (this.switchBuffer?.gesture === gesture) {
                this.switchBuffer.count++;
            } else {
                this.switchBuffer = { gesture, count: 1 };
            }
            
            // Not enough consecutive detections yet - continue with current gesture
            if (this.switchBuffer.count < this.switchConfirmationCount) {
                this.continueActiveGesture(now);
                return;
            }
            
            // Enough evidence to switch - end old gesture and start new one
            this.switchBuffer = null;
            this.endActiveGesture();
        }
        
        // Start or continue with this gesture
        if (this.activeGesture !== gesture) {
            this.activeGesture = gesture;
            this.activeGestureStartTime = now;
            this.switchBuffer = null;
        }

        // Check cooldown for rate limiting continuous triggers
        const lastTrigger = this.lastTriggerTime.get(gesture) || 0;
        if (now - lastTrigger >= config.cooldownMs) {
            config.onTrigger();
            this.lastTriggerTime.set(gesture, now);
        }
    }
    
    private continueActiveGesture(now: number): void {
        if (!this.activeGesture) return;
        const config = this.configs.get(this.activeGesture);
        if (!config) return;
        
        const lastTrigger = this.lastTriggerTime.get(this.activeGesture) || 0;
        if (now - lastTrigger >= config.cooldownMs) {
            config.onTrigger();
            this.lastTriggerTime.set(this.activeGesture, now);
        }
    }

    private handleDiscreteGesture(gesture: GestureType, config: GestureConfig, now: number): void {
        // End any active continuous gesture
        this.endActiveGesture();

        // Check cooldown
        const lastTrigger = this.lastTriggerTime.get(gesture) || 0;
        if (now - lastTrigger < config.cooldownMs) {
            return; // Still in cooldown
        }

        // Require consecutive detections for discrete gestures
        const currentCount = (this.discreteDetectionBuffer.get(gesture) || 0) + 1;
        this.discreteDetectionBuffer.set(gesture, currentCount);

        if (currentCount >= this.discreteConfirmationCount) {
            config.onTrigger();
            this.lastTriggerTime.set(gesture, now);
            this.resetDiscreteBuffer(gesture);
        }
    }

    private endActiveGesture(): void {
        if (this.activeGesture) {
            const config = this.configs.get(this.activeGesture);
            if (config?.onEnd) {
                config.onEnd();
            }
            this.activeGesture = null;
            this.activeGestureStartTime = 0;
        }
    }

    private resetDiscreteBuffer(gesture: GestureType): void {
        this.discreteDetectionBuffer.set(gesture, 0);
    }

    /**
     * Call this when no gesture is detected to reset state.
     */
    handleIdle(): void {
        this.endActiveGesture();
        // Reset all discrete buffers
        for (const gesture of this.discreteDetectionBuffer.keys()) {
            this.resetDiscreteBuffer(gesture);
        }
    }

    /**
     * Get the currently active continuous gesture, if any.
     */
    getActiveGesture(): GestureType | null {
        return this.activeGesture;
    }

    /**
     * Get how long the current gesture has been active (ms).
     */
    getActiveGestureDuration(): number {
        if (!this.activeGesture) return 0;
        return Date.now() - this.activeGestureStartTime;
    }
}
