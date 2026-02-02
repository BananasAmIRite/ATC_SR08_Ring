// Three.js Ring Visualization in World Frame
// This file handles the 3D visualization of the ring's orientation

let scene, camera, renderer, accelArrow;
let visualizationActive = false;

/**
 * Initialize the Three.js scene for ring visualization
 */
function initRingVisualization() {
    const container = document.getElementById('ring-visualization');
    if (!container) {
        console.error('Ring visualization container not found');
        return;
    }

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(3, 3, 3);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Add grid helper for ground reference
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Add world frame axes (fixed reference)
    const worldAxes = new THREE.AxesHelper(2);
    worldAxes.position.set(0, 0, 0);
    scene.add(worldAxes);

    // Add labels for world axes
    addAxisLabels();

    // Add acceleration vector indicator (initially pointing up)
    accelArrow = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0), // Initial direction (will be updated)
        new THREE.Vector3(0, 0, 0), // Origin
        1, // Initial length (will be updated)
        0x00ff00, // Green color
        0.3,
        0.2,
    );
    scene.add(accelArrow);

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    visualizationActive = true;
    animate();

    console.log('Ring visualization initialized');
}

/**
 * Add text labels for axes (simplified version)
 */
function addAxisLabels() {
    // Create small spheres to indicate axis endpoints
    const labelMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const labelGeometry = new THREE.SphereGeometry(0.05);

    // X axis (red)
    const xLabel = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    xLabel.position.set(2.2, 0, 0);
    scene.add(xLabel);

    // Y axis (green)
    const yLabel = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    yLabel.position.set(0, 2.2, 0);
    scene.add(yLabel);

    // Z axis (blue)
    const zLabel = new THREE.Mesh(labelGeometry, new THREE.MeshBasicMaterial({ color: 0x0000ff }));
    zLabel.position.set(0, 0, 2.2);
    scene.add(zLabel);
}

/**
 * Handle window resize
 */
function onWindowResize() {
    const container = document.getElementById('ring-visualization');
    if (!container) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

/**
 * Animation loop
 */
function animate() {
    if (!visualizationActive) return;

    requestAnimationFrame(animate);

    // Gentle rotation for better viewing (can be disabled if you want static view)
    // camera.position.x = 3 * Math.cos(Date.now() * 0.0001);
    // camera.position.z = 3 * Math.sin(Date.now() * 0.0001);
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
}

/**
 * Update ring orientation based on gravity vector (not used, kept for API compatibility)
 * @param {Object} gravity - Gravity vector {x, y, z}
 */
function updateRingOrientation(gravity) {
    // Not used in this simplified visualization
    return;
}

/**
 * Update arrow to show linear acceleration vector (gravity subtracted, rotated to world frame)
 * @param {Object} linearAccel - Linear acceleration in world frame {x, y, z}
 */
function updateRingPosition(linearAccel) {
    if (!accelArrow || !linearAccel) return;

    console.log('Updating arrow with:', linearAccel); // Debug log

    // Create acceleration vector in Three.js coordinates
    // Map raw accelerometer coordinates to Three.js (adjust based on your sensor orientation)
    const accelVec = new THREE.Vector3(linearAccel.x, linearAccel.z, linearAccel.y);

    const accelMagnitude = accelVec.length();

    console.log('Acceleration magnitude:', accelMagnitude); // Debug log

    // Always show the arrow, even for small magnitudes
    if (accelMagnitude > 0.01) {
        // Normalize direction
        const direction = accelVec.clone().normalize();

        // Update arrow from origin
        accelArrow.position.set(0, 0, 0);
        accelArrow.setDirection(direction);
        accelArrow.setLength(accelMagnitude * 2, 0.3, 0.2); // Scale by 2 for visibility
        accelArrow.visible = true;

        console.log('Arrow visible, direction:', direction, 'length:', accelMagnitude * 2); // Debug log
    } else {
        // Hide arrow when acceleration is negligible
        accelArrow.visible = false;
        console.log('Arrow hidden - magnitude too small'); // Debug log
    }
}

/**
 * Reset visualization
 */
function resetRingPosition() {
    if (accelArrow) {
        accelArrow.visible = false;
    }
}

/**
 * Stop the visualization
 */
function stopRingVisualization() {
    visualizationActive = false;
    console.log('Ring visualization stopped');
}

/**
 * Clean up Three.js resources
 */
function disposeRingVisualization() {
    visualizationActive = false;

    if (renderer) {
        const container = document.getElementById('ring-visualization');
        if (container && renderer.domElement) {
            container.removeChild(renderer.domElement);
        }
        renderer.dispose();
    }

    scene = null;
    camera = null;
    renderer = null;
    accelArrow = null;

    console.log('Ring visualization disposed');
}

// Export functions for use in main script
window.RingVisualization = {
    init: initRingVisualization,
    updateOrientation: updateRingOrientation,
    updatePosition: updateRingPosition,
    resetPosition: resetRingPosition,
    stop: stopRingVisualization,
    dispose: disposeRingVisualization,
};
