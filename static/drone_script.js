// Set Cesium access token
Cesium.Ion.defaultAccessToken = 'add your token';

// Camera control variables
let currentCameraMode = 'thirdPerson'; // 'firstPerson' or 'thirdPerson'
let cameraOffset = new Cesium.Cartesian3(-10.0, 0.0, 3.0); // Default third-person offset
let cameraPostUpdateListener;

// Starting position (San Francisco)
const initialLongitude = -122.4175;
const initialLatitude = 37.655;
const initialHeight = 100;

// Initialize Cesium viewer
const viewer = new Cesium.Viewer('cesiumContainer', {
    terrain: Cesium.Terrain.fromWorldTerrain(),
    shouldAnimate: true,
    navigationHelpButton: false,
    timeline: false,
    animation: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    selectionIndicator: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    vrButton: false,
    sceneModePicker: false
});

// Set camera constraints to prevent zooming out too far
viewer.scene.screenSpaceCameraController.minimumZoomDistance = 1;
viewer.scene.screenSpaceCameraController.maximumZoomDistance = 10000000;

// Adjust near/far planes
viewer.scene.camera.frustum.near = 0.1;
viewer.scene.camera.frustum.far = 10000000;

// Immediately fly to the initial position
viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
        initialLongitude, 
        initialLatitude, 
        initialHeight + 500
    ),
    orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0
    },
    duration: 2
});

// Multi-model management system
class ModelManager {
    constructor() {
        this.models = new Map(); // Store all models by ID
        this.activeModelId = null; // Currently selected model for control
        this.nextModelId = 1; // Auto-incrementing ID
        this.colors = [
            Cesium.Color.RED,
            Cesium.Color.BLUE,
            Cesium.Color.GREEN,
            Cesium.Color.YELLOW,
            Cesium.Color.PURPLE,
            Cesium.Color.ORANGE,
            Cesium.Color.CYAN,
            Cesium.Color.PINK,
            Cesium.Color.LIME,
            Cesium.Color.MAGENTA
        ];
        this.shapes = ['circle', 'square', 'triangle', 'diamond', 'star'];
    }

    getNextColor() {
        return this.colors[(this.nextModelId - 1) % this.colors.length];
    }

    getNextShape() {
        return this.shapes[(this.nextModelId - 1) % this.shapes.length];
    }

    async addModel(name, assetId, longitude, latitude, height) {
        const modelId = this.nextModelId++;
        const color = this.getNextColor();
        const shape = this.getNextShape();

        try {
            // Load the 3D tileset from Cesium Ion
            const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(assetId, {
                show: true,
                maximumScreenSpaceError: 2,
                dynamicScreenSpaceError: true,
                dynamicScreenSpaceErrorDensity: 0.00278,
                dynamicScreenSpaceErrorFactor: 4.0,
                dynamicScreenSpaceErrorHeightFalloff: 0.25,
                skipLevelOfDetail: true,
                preferLeaves: true,
                cullWithChildrenBounds: true
            });

            // Position the tileset at the specified location with larger scale
            const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
            const modelMatrix = Cesium.Matrix4.fromTranslation(position);
            // Increased scale from 3.0 to 10.0 for much larger models
            Cesium.Matrix4.multiplyByScale(modelMatrix, new Cesium.Cartesian3(10.0, 10.0, 10.0), modelMatrix);
            tileset.modelMatrix = modelMatrix;

            viewer.scene.primitives.add(tileset);

            // Create visual indicator based on shape - all with disableDepthTestDistance
            let indicatorEntity;
            if (shape === 'circle') {
                indicatorEntity = viewer.entities.add({
                    name: `${name} Position Indicator`,
                    position: position,
                    point: {
                        pixelSize: 25,
                        color: color.withAlpha(0.9),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 4,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        scaleByDistance: new Cesium.NearFarScalar(1.0, 1.5, 10000, 0.8)
                    }
                });
            } else if (shape === 'square') {
                indicatorEntity = viewer.entities.add({
                    name: `${name} Position Indicator`,
                    position: position,
                    box: {
                        dimensions: new Cesium.Cartesian3(50.0, 50.0, 15.0),
                        material: color.withAlpha(0.9),
                        outline: true,
                        outlineColor: Cesium.Color.WHITE,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY
                    }
                });
            } else if (shape === 'triangle') {
                indicatorEntity = viewer.entities.add({
                    name: `${name} Position Indicator`,
                    position: position,
                    cylinder: {
                        length: 15.0,
                        topRadius: 0.0,
                        bottomRadius: 25.0,
                        material: color.withAlpha(0.9),
                        outline: true,
                        outlineColor: Cesium.Color.WHITE,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY
                    }
                });
            } else if (shape === 'diamond') {
                indicatorEntity = viewer.entities.add({
                    name: `${name} Position Indicator`,
                    position: position,
                    ellipsoid: {
                        radii: new Cesium.Cartesian3(25.0, 25.0, 40.0),
                        material: color.withAlpha(0.9),
                        outline: true,
                        outlineColor: Cesium.Color.WHITE,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY
                    }
                });
            } else { // star
                indicatorEntity = viewer.entities.add({
                    name: `${name} Position Indicator`,
                    position: position,
                    point: {
                        pixelSize: 30,
                        color: color.withAlpha(0.9),
                        outlineColor: Cesium.Color.WHITE,
                        outlineWidth: 5,
                        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                        scaleByDistance: new Cesium.NearFarScalar(1.0, 1.5, 10000, 0.8)
                    }
                });
            }

            // Add a label that's always visible
            const labelEntity = viewer.entities.add({
                position: position,
                label: {
                    text: name,
                    font: '16pt sans-serif',
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 3,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                    pixelOffset: new Cesium.Cartesian2(0, -60),
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                    disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    showBackground: true,
                    backgroundColor: color.withAlpha(0.8),
                    backgroundPadding: new Cesium.Cartesian2(10, 8),
                    // Removed distanceDisplayCondition to make labels always visible
                    scaleByDistance: new Cesium.NearFarScalar(1.0, 1.2, 5000, 0.8)
                }
            });

            // Create physics engine for this model
            const physics = new ModelPhysicsEngine(position, longitude, latitude, height);

            // Store model data
            const modelData = {
                id: modelId,
                name: name,
                assetId: assetId,
                position: { longitude, latitude, height },
                tileset: tileset,
                indicator: indicatorEntity,
                label: labelEntity,
                physics: physics,
                color: color,
                shape: shape,
                isActive: false
            };

            this.models.set(modelId, modelData);

            // Set as active if it's the first model
            if (this.models.size === 1) {
                this.setActiveModel(modelId);
            }

            // Fly to the new model's position
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.fromDegrees(
                    longitude, 
                    latitude, 
                    height + 800
                ),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-45),
                    roll: 0.0
                },
                duration: 2
            });

            addCommandMessage(`Loaded model: ${name} (ID: ${modelId}, Asset: ${assetId})`, 'system');
            this.updateModelList();
            return modelId;

        } catch (error) {
            console.error('Error loading model:', error);
            addCommandMessage(`Error loading model ${name}. Please check the Asset ID and coordinates.`, 'error');
            return null;
        }
    }

    setActiveModel(modelId) {
        // Deactivate current active model
        if (this.activeModelId && this.models.has(this.activeModelId)) {
            const currentActive = this.models.get(this.activeModelId);
            currentActive.isActive = false;
            // Reset indicator appearance
            this.updateModelIndicator(currentActive);
        }

        // Activate new model
        if (this.models.has(modelId)) {
            this.activeModelId = modelId;
            const newActive = this.models.get(modelId);
            newActive.isActive = true;
            // Highlight indicator
            this.updateModelIndicator(newActive);
            
            addCommandMessage(`Switched control to: ${newActive.name}`, 'system');
            this.updateStatusDisplay(newActive);

            // Update camera to follow the new active model
            this.setupCameraModes();
        }
    }

    updateModelIndicator(model) {
        if (model.isActive) {
            // Make active model indicator more prominent
            if (model.indicator.point) {
                model.indicator.point.pixelSize = 35;
                model.indicator.point.outlineWidth = 6;
            }
            if (model.indicator.box) {
                model.indicator.box.outlineWidth = 6;
                model.indicator.box.dimensions = new Cesium.Cartesian3(60.0, 60.0, 20.0);
            }
            if (model.indicator.cylinder) {
                model.indicator.cylinder.outlineWidth = 6;
                model.indicator.cylinder.bottomRadius = 30.0;
            }
            if (model.indicator.ellipsoid) {
                model.indicator.ellipsoid.outlineWidth = 6;
                model.indicator.ellipsoid.radii = new Cesium.Cartesian3(30.0, 30.0, 50.0);
            }
            // Make label more prominent for active model
            if (model.label) {
                model.label.label.font = '18pt sans-serif';
                model.label.label.outlineWidth = 4;
            }
        } else {
            // Normal appearance for inactive models
            if (model.indicator.point) {
                model.indicator.point.pixelSize = 25;
                model.indicator.point.outlineWidth = 4;
            }
            if (model.indicator.box) {
                model.indicator.box.outlineWidth = 3;
                model.indicator.box.dimensions = new Cesium.Cartesian3(50.0, 50.0, 15.0);
            }
            if (model.indicator.cylinder) {
                model.indicator.cylinder.outlineWidth = 3;
                model.indicator.cylinder.bottomRadius = 25.0;
            }
            if (model.indicator.ellipsoid) {
                model.indicator.ellipsoid.outlineWidth = 3;
                model.indicator.ellipsoid.radii = new Cesium.Cartesian3(25.0, 25.0, 40.0);
            }
            // Normal label for inactive models
            if (model.label) {
                model.label.label.font = '16pt sans-serif';
                model.label.label.outlineWidth = 3;
            }
        }
    }

    getActiveModel() {
        return this.activeModelId ? this.models.get(this.activeModelId) : null;
    }

    updateStatusDisplay(model) {
        if (model && model.physics) {
            const altitudeDisplay = document.getElementById('altitudeDisplay');
            const speedDisplay = document.getElementById('speedDisplay');
            const batteryDisplay = document.getElementById('batteryDisplay');
            const motorStatus = document.getElementById('motorStatus');
            
            if (altitudeDisplay) altitudeDisplay.textContent = `${model.position.height.toFixed(1)} m`;
            if (speedDisplay) speedDisplay.textContent = `${model.physics.speed.toFixed(1)} m/s`;
            if (batteryDisplay) batteryDisplay.textContent = `${Math.round(model.physics.battery)}%`;
            if (motorStatus) motorStatus.textContent = model.physics.motorRunning ? 'ON' : 'OFF';
        }
    }

    updateModelList() {
        // Create or update model selection UI
        let modelListContainer = document.getElementById('modelListContainer');
        if (!modelListContainer) {
            modelListContainer = document.createElement('div');
            modelListContainer.id = 'modelListContainer';
            modelListContainer.className = 'model-list-container';
            
            const controlsContainer = document.querySelector('.physics-controls');
            if (controlsContainer) {
                controlsContainer.appendChild(modelListContainer);
            }
        }

        modelListContainer.innerHTML = '<h5>Active Models:</h5>';
        
        this.models.forEach((model, id) => {
            const modelItem = document.createElement('div');
            modelItem.className = `model-item ${model.isActive ? 'active' : ''}`;
            modelItem.innerHTML = `
                <span class="model-indicator" style="background-color: ${model.color.toCssColorString()}"></span>
                <span class="model-name">${model.name}</span>
                <button class="select-model-btn" data-model-id="${id}">Select</button>
            `;
            modelListContainer.appendChild(modelItem);
        });

        // Add event listeners for model selection
        document.querySelectorAll('.select-model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modelId = parseInt(e.target.dataset.modelId);
                this.setActiveModel(modelId);
            });
        });
    }

    updatePhysics(deltaTime) {
        this.models.forEach(model => {
            if (model.physics) {
                model.physics.updatePhysics(deltaTime);
                
                // Update model position
                const currentCartesian = model.physics.position.clone();
                
                if (model.tileset) {
                    model.tileset.modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(currentCartesian);
                    // Keep the larger scale factor
                    Cesium.Matrix4.multiplyByScale(model.tileset.modelMatrix, new Cesium.Cartesian3(10.0, 10.0, 10.0), model.tileset.modelMatrix);
                }
                
                if (model.indicator) {
                    model.indicator.position = currentCartesian;
                }
                
                if (model.label) {
                    model.label.position = currentCartesian;
                }

                // Update position data
                const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(currentCartesian);
                if (cartographic) {
                    model.position.longitude = Cesium.Math.toDegrees(cartographic.longitude);
                    model.position.latitude = Cesium.Math.toDegrees(cartographic.latitude);
                    model.position.height = cartographic.height;
                }
            }
        });

        // Update status display for active model
        const activeModel = this.getActiveModel();
        if (activeModel) {
            this.updateStatusDisplay(activeModel);
        }
    }

    setupCameraModes() {
        const cameraButton = document.getElementById('cameraButton');
        if (!cameraButton) {
            console.warn('Camera button not found');
            return; // Ensure button exists
        }

        const activeModel = this.getActiveModel();
        if (!activeModel) {
            console.warn('No active model found');
            return; // Ensure an active model exists
        }

        // Remove existing listener to prevent duplicates
        if (cameraPostUpdateListener) {
            viewer.scene.postUpdate.removeEventListener(cameraPostUpdateListener);
            cameraPostUpdateListener = undefined;
        }

        if (currentCameraMode === 'firstPerson') {
            // FPV: Lock camera to drone's position and orientation
            viewer.scene.screenSpaceCameraController.enableInputs = false; // Disable user camera control
            const cameraButtonText = document.getElementById('cameraButtonText');
            if (cameraButtonText) cameraButtonText.textContent = 'THIRD-PERSON VIEW';

            cameraPostUpdateListener = () => {
                const modelPosition = activeModel.physics.position;
                const modelOrientation = activeModel.physics.orientation; // Assuming physics engine provides orientation

                if (modelPosition && modelOrientation) {
                    // Calculate camera position relative to the drone for FPV
                    // This offset places the camera slightly above and forward, looking in the drone's direction
                    const fpvOffset = new Cesium.Cartesian3(0.5, 0.0, 0.2); // Small offset for eye-level view
                    const transformedOffset = Cesium.Matrix3.multiplyByVector(
                        Cesium.Matrix3.fromQuaternion(modelOrientation),
                        fpvOffset,
                        new Cesium.Cartesian3()
                    );
                    const cameraPosition = Cesium.Cartesian3.add(modelPosition, transformedOffset, new Cesium.Cartesian3());

                    viewer.camera.setView({
                        destination: cameraPosition,
                        orientation: {
                            heading: Cesium.HeadingPitchRoll.fromQuaternion(modelOrientation).heading,
                            pitch: Cesium.HeadingPitchRoll.fromQuaternion(modelOrientation).pitch,
                            roll: Cesium.HeadingPitchRoll.fromQuaternion(modelOrientation).roll
                        }
                    });
                }
            };
            viewer.scene.postUpdate.addEventListener(cameraPostUpdateListener);

        } else { // thirdPerson
            // TPV: Position camera behind and above the drone, allow user control
            viewer.scene.screenSpaceCameraController.enableInputs = true; // Enable user camera control
            const cameraButtonText = document.getElementById('cameraButtonText');
            if (cameraButtonText) cameraButtonText.textContent = 'FIRST-PERSON VIEW';

            // Set initial TPV position relative to the drone
            const tpvOffset = new Cesium.Cartesian3(-10.0, 0.0, 3.0); // Behind and slightly above
            viewer.camera.flyTo({
                destination: Cesium.Cartesian3.add(activeModel.physics.position, tpvOffset, new Cesium.Cartesian3()),
                orientation: {
                    heading: Cesium.Math.toRadians(0),
                    pitch: Cesium.Math.toRadians(-30),
                    roll: 0.0
                },
                duration: 1 // Smooth transition
            });

            // For TPV, we don't need a postUpdate listener to constantly update camera position
            // User can control it freely, or it will follow the model if the model moves significantly
        }
    }

    initCameraToggle() {
        const cameraButton = document.getElementById('cameraButton');
        if (cameraButton) {
            // Remove any existing event listeners
            cameraButton.replaceWith(cameraButton.cloneNode(true));
            const newCameraButton = document.getElementById('cameraButton');
            
            newCameraButton.addEventListener('click', () => {
                currentCameraMode = (currentCameraMode === 'thirdPerson') ? 'firstPerson' : 'thirdPerson';
                this.setupCameraModes();
                addCommandMessage(`Switched to ${currentCameraMode.toUpperCase()} view.`, 'system');
            });
            
            console.log('Camera toggle initialized successfully');
        } else {
            console.error('Camera button not found during initialization');
        }
    }
}

// Enhanced Physics Engine for individual models
class ModelPhysicsEngine {
    constructor(initialPosition, longitude, latitude, height) {
        this.initialPosition = initialPosition.clone(); // Store initial position
        this.position = initialPosition.clone();
        this.velocity = new Cesium.Cartesian3(0, 0, 0);
        this.acceleration = new Cesium.Cartesian3(0, 0, 0);
        this.orientation = Cesium.Quaternion.IDENTITY.clone(); // Orientation as Quaternion
        this.angularVelocity = new Cesium.Cartesian3(0, 0, 0); // Radians per second
        
        this.mass = 2.5;
        this.dragCoefficient = 0.05; // Reduced drag for smoother movement
        this.thrustPower = 0.5;
        this.rotorSpeed = 1500;
        this.windResistance = 0.1; // Reduced wind resistance
        this.gravityFactor = 1.0;
        this.motorRunning = false;
        this.battery = 100;
        this.speed = 0;
        this.maxSpeed = 3; // Increased max speed
        this.maxAltitude = 1000; // Increased max altitude
        this.movementEnabled = false;
        this.targetVelocity = new Cesium.Cartesian3(0, 0, 0); // Target velocity for smoother control
        this.accelerationRate = 5; // How quickly drone accelerates to target velocity
        this.decelerationRate = 2; // How quickly drone decelerates
        
        this.initialCartographic = new Cesium.Cartographic(
            Cesium.Math.toRadians(longitude),
            Cesium.Math.toRadians(latitude),
            height
        );
    }
    
    startMotor() {
        this.motorRunning = true;
        this.movementEnabled = true;
        addCommandMessage('Motor started for active model.', 'system');
    }
    
    stopMotor() {
        this.motorRunning = false;
        this.movementEnabled = false;
        addCommandMessage('Motor stopped for active model.', 'system');
        this.targetVelocity = new Cesium.Cartesian3(0, 0, 0);
    }
    
    updatePhysics(deltaTime) {
        if (!deltaTime || deltaTime <= 0 || isNaN(deltaTime)) deltaTime = 0.016; // Ensure a valid deltaTime (60fps)

        // Update battery
        if (this.motorRunning && this.battery > 0) {
            this.battery = Math.max(0, this.battery - (0.02 * (this.rotorSpeed / 3000) * this.thrustPower * deltaTime));
        }

        // Apply forces and update acceleration
        if (this.motorRunning && this.battery > 0) {
            // Vertical thrust and gravity
            const thrust = (this.rotorSpeed / 3000) * this.thrustPower * 9.8 * this.gravityFactor;
            this.acceleration.z = thrust - (9.8 * this.gravityFactor);

            // Horizontal movement (smoother acceleration/deceleration)
            const currentHorizontalVelocity = new Cesium.Cartesian3(this.velocity.x, this.velocity.y, 0);
            const targetHorizontalVelocity = new Cesium.Cartesian3(this.targetVelocity.x, this.targetVelocity.y, 0);

            const velocityDiff = Cesium.Cartesian3.subtract(targetHorizontalVelocity, currentHorizontalVelocity, new Cesium.Cartesian3());
            const accelerationMagnitude = Cesium.Cartesian3.magnitude(velocityDiff) > 0.01 ? this.accelerationRate : this.decelerationRate;
            
            // Apply acceleration towards target velocity
            if (Cesium.Cartesian3.magnitude(velocityDiff) > 0.01) {
                const accelerationDirection = Cesium.Cartesian3.normalize(velocityDiff, new Cesium.Cartesian3());
                const accelerationVector = Cesium.Cartesian3.multiplyByScalar(accelerationDirection, accelerationMagnitude, new Cesium.Cartesian3());

                this.acceleration.x = accelerationVector.x;
                this.acceleration.y = accelerationVector.y;
            } else {
                this.acceleration.x = 0;
                this.acceleration.y = 0;
            }

            // Drag force
            const speedMagnitude = Cesium.Cartesian3.magnitude(this.velocity);
            if (speedMagnitude > 0) {
                const dragMagnitude = 0.5 * this.dragCoefficient * speedMagnitude ** 2 * this.windResistance;
                const dragForce = Cesium.Cartesian3.multiplyByScalar(Cesium.Cartesian3.normalize(this.velocity, new Cesium.Cartesian3()), -dragMagnitude, new Cesium.Cartesian3());
                this.acceleration = Cesium.Cartesian3.add(this.acceleration, Cesium.Cartesian3.divideByScalar(dragForce, this.mass, new Cesium.Cartesian3()), new Cesium.Cartesian3());
            }

        } else {
            // Only gravity and deceleration when motor is off or battery is dead
            this.acceleration.z = -9.8 * this.gravityFactor;
            this.acceleration.x = -this.velocity.x * this.decelerationRate * 0.1; // Slower horizontal deceleration
            this.acceleration.y = -this.velocity.y * this.decelerationRate * 0.1;
        }

        // Update velocity
        this.velocity = Cesium.Cartesian3.add(this.velocity, Cesium.Cartesian3.multiplyByScalar(this.acceleration, deltaTime, new Cesium.Cartesian3()), new Cesium.Cartesian3());

        // Limit max speed
        const currentSpeed = Cesium.Cartesian3.magnitude(this.velocity);
        if (currentSpeed > this.maxSpeed) {
            this.velocity = Cesium.Cartesian3.multiplyByScalar(Cesium.Cartesian3.normalize(this.velocity, new Cesium.Cartesian3()), this.maxSpeed, new Cesium.Cartesian3());
        }

        // Update position
        const cartographic = Cesium.Ellipsoid.WGS84.cartesianToCartographic(this.position);
        if (cartographic) {
            let newLongitude = Cesium.Math.toDegrees(cartographic.longitude) + (this.velocity.x * deltaTime / 111139); // Approx meters to degrees conversion
            let newLatitude = Cesium.Math.toDegrees(cartographic.latitude) + (this.velocity.y * deltaTime / 111139); // Approx meters to degrees conversion
            let newHeight = cartographic.height + this.velocity.z * deltaTime;

            // Check for NaN values before creating new Cartesian3
            if (isNaN(newLongitude) || isNaN(newLatitude) || isNaN(newHeight)) {
                console.warn('NaN detected in new position coordinates. Resetting velocity and position.');
                this.velocity = new Cesium.Cartesian3(0, 0, 0);
                this.acceleration = new Cesium.Cartesian3(0, 0, 0);
                this.position = this.initialPosition.clone(); // Reset to initial position
                return; // Skip further updates for this frame
            }

            // Altitude limits
            if (newHeight < 0) {
                newHeight = 0;
                this.velocity.z = 0; // Stop vertical movement at ground
            }
            if (newHeight > this.maxAltitude) {
                newHeight = this.maxAltitude;
                this.velocity.z = Math.min(0, this.velocity.z); // Stop upward movement at max altitude
            }

            this.position = Cesium.Cartesian3.fromDegrees(newLongitude, newLatitude, newHeight);
        }

        this.speed = Cesium.Cartesian3.magnitude(this.velocity);

        // Update orientation based on velocity (simple yaw for now)
        if (this.speed > 0.1) { // Only update orientation if moving significantly
            const heading = Math.atan2(this.velocity.x, this.velocity.y); // Yaw based on horizontal velocity
            this.orientation = Cesium.Quaternion.fromAxisAngle(Cesium.Cartesian3.UNIT_Z, heading);
        }
    }
    
    applyMovement(direction, intensity) {
        if (!this.motorRunning) return;
        
        const angleRad = Cesium.Math.toRadians(direction);
        const forceMagnitude = this.maxSpeed * intensity; // Directly set target velocity based on maxSpeed
        
        // Set target velocity components based on direction and intensity
        this.targetVelocity.x = Math.sin(angleRad) * forceMagnitude;
        this.targetVelocity.y = Math.cos(angleRad) * forceMagnitude;
    }
    
    stopHorizontalMovement() {
        this.targetVelocity.x = 0;
        this.targetVelocity.y = 0;
    }
    
    emergency() {
        this.motorRunning = false;
        this.movementEnabled = false;
        this.velocity = new Cesium.Cartesian3(0, 0, -1); // Start falling slowly
        this.targetVelocity = new Cesium.Cartesian3(0, 0, 0);
        addCommandMessage('EMERGENCY STOP ACTIVATED for active model!', 'error');
    }
    
    hover() {
        if (this.motorRunning) {
            this.stopHorizontalMovement();
            // Adjust rotor speed to counteract gravity for hovering
            const targetThrust = 9.8 * this.gravityFactor;
            this.rotorSpeed = (targetThrust / (this.thrustPower * 9.8)) * 3000; // Calculate rotor speed for hover
            addCommandMessage('Active model attempting to hover.', 'system');
        }
    }
    
    returnHome() {
        // Reset position to initial coordinates
        this.position = this.initialPosition.clone();
        // Reset velocity and acceleration
        this.velocity = new Cesium.Cartesian3(0, 0, 0);
        this.acceleration = new Cesium.Cartesian3(0, 0, 0);
        this.targetVelocity = new Cesium.Cartesian3(0, 0, 0);
        this.speed = 0;
        addCommandMessage('Active model returning to home position...', 'system');
    }
}

// Global model manager
const modelManager = new ModelManager();

// Initialize slider controls for active model
function initSliderControls() {
    const thrustPower = document.getElementById('thrustPower');
    const rotorSpeed = document.getElementById('rotorSpeed');
    const windResistance = document.getElementById('windResistance');
    const gravityFactor = document.getElementById('gravityFactor');
    
    if (!thrustPower || !rotorSpeed || !windResistance || !gravityFactor) {
        console.warn('Some slider controls not found');
        return;
    }
    
    function updateActiveModelControls() {
        const activeModel = modelManager.getActiveModel();
        if (activeModel && activeModel.physics) {
            thrustPower.value = activeModel.physics.thrustPower * 100;
            rotorSpeed.value = activeModel.physics.rotorSpeed;
            windResistance.value = activeModel.physics.windResistance * 100;
            gravityFactor.value = activeModel.physics.gravityFactor * 100;
            
            const thrustValue = document.getElementById('thrustValue');
            const rotorValue = document.getElementById('rotorValue');
            const windValue = document.getElementById('windValue');
            const gravityValue = document.getElementById('gravityValue');
            
            if (thrustValue) thrustValue.textContent = `${thrustPower.value}%`;
            if (rotorValue) rotorValue.textContent = `${rotorSpeed.value} RPM`;
            if (windValue) windValue.textContent = `${windResistance.value}%`;
            if (gravityValue) gravityValue.textContent = `${gravityFactor.value}%`;
        }
    }
    
    updateActiveModelControls();
    
    thrustPower.addEventListener('input', () => {
        const activeModel = modelManager.getActiveModel();
        if (activeModel && activeModel.physics) {
            activeModel.physics.thrustPower = thrustPower.value / 100;
            const thrustValue = document.getElementById('thrustValue');
            if (thrustValue) thrustValue.textContent = `${thrustPower.value}%`;
        }
    });
    
    rotorSpeed.addEventListener('input', () => {
        const activeModel = modelManager.getActiveModel();
        if (activeModel && activeModel.physics) {
            activeModel.physics.rotorSpeed = parseInt(rotorSpeed.value);
            const rotorValue = document.getElementById('rotorValue');
            if (rotorValue) rotorValue.textContent = `${rotorSpeed.value} RPM`;
        }
    });
    
    windResistance.addEventListener('input', () => {
        const activeModel = modelManager.getActiveModel();
        if (activeModel && activeModel.physics) {
            activeModel.physics.windResistance = windResistance.value / 100;
            const windValue = document.getElementById('windValue');
            if (windValue) windValue.textContent = `${windResistance.value}%`;
        }
    });
    
    gravityFactor.addEventListener('input', () => {
        const activeModel = modelManager.getActiveModel();
        if (activeModel && activeModel.physics) {
            activeModel.physics.gravityFactor = gravityFactor.value / 100;
            const gravityValue = document.getElementById('gravityValue');
            if (gravityValue) gravityValue.textContent = `${gravityFactor.value}%`;
        }
    });
}

// Initialize motor control button for active model
function initMotorControl() {
    const motorButton = document.getElementById('motorButton');
    if (!motorButton) {
        console.warn('Motor button not found');
        return;
    }
    
    motorButton.addEventListener('click', () => {
        const activeModel = modelManager.getActiveModel();
        if (activeModel && activeModel.physics) {
            if (activeModel.physics.motorRunning) {
                activeModel.physics.stopMotor();
                const motorStatus = document.getElementById('motorStatus');
                const motorButtonText = document.getElementById('motorButtonText');
                if (motorStatus) motorStatus.textContent = 'OFF';
                if (motorButtonText) motorButtonText.textContent = 'START MOTOR';
            } else {
                activeModel.physics.startMotor();
                const motorStatus = document.getElementById('motorStatus');
                const motorButtonText = document.getElementById('motorButtonText');
                if (motorStatus) motorStatus.textContent = 'ON';
                if (motorButtonText) motorButtonText.textContent = 'STOP MOTOR';
            }
        } else {
            addCommandMessage('No active model selected', 'error');
        }
    });
}

function initKeyboardControls() {
    const keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        q: false,
        e: false,
        Shift: false
    };

    let viewerHasFocus = false;

    viewer.canvas.addEventListener("click", () => {
        viewerHasFocus = true;
        viewer.canvas.focus();
        addCommandMessage("Keyboard controls enabled (clicked on map)", "system");
    });

    viewer.canvas.addEventListener("blur", () => {
        viewerHasFocus = false;
        keys.w = keys.a = keys.s = keys.d = false;
        const activeModel = modelManager.getActiveModel();
        if (activeModel && activeModel.physics) {
            activeModel.physics.stopHorizontalMovement();
        }
    });

    document.addEventListener("keydown", (e) => {
        const activeModel = modelManager.getActiveModel();
        if (!viewerHasFocus || !activeModel || !activeModel.physics || !activeModel.physics.movementEnabled) return;
        
        const key = e.key.toLowerCase();
        
        if (key === "q") {
            e.preventDefault();
            activeModel.physics.rotorSpeed = Math.min(3000, activeModel.physics.rotorSpeed + 200);
        } else if (key === "e") {
            e.preventDefault();
            activeModel.physics.rotorSpeed = Math.max(800, activeModel.physics.rotorSpeed - 200);
        }

        // Only apply movement if key is currently pressed
        if (["w", "a", "s", "d"].includes(key) && !keys[key]) {
            keys[key] = true; // Mark key as pressed
            e.preventDefault();
            let direction = 0;
            const intensity = keys.Shift ? 1.5 : 1.0;

            if (key === "w") {
                direction = 0;
            } else if (key === "s") {
                direction = 180;
            }
            if (key === "a") {
                direction = 270;
            } else if (key === "d") {
                direction = 90;
            }
            activeModel.physics.applyMovement(direction, intensity);
        }

        if (e.key === "Shift") keys.Shift = true;
    });

    document.addEventListener("keyup", (e) => {
        const key = e.key.toLowerCase();
        
        if (["w", "a", "s", "d"].includes(key)) {
            keys[key] = false; // Mark key as released
            const activeModel = modelManager.getActiveModel();
            if (activeModel && activeModel.physics) {
                // If no directional keys are pressed, stop horizontal movement
                if (!keys.w && !keys.a && !keys.s && !keys.d) {
                    activeModel.physics.stopHorizontalMovement();
                }
            }
        }

        if (e.key === "Shift") keys.Shift = false;
    });
}

// Command message system
function addCommandMessage(message, type, isRepeated = false) {
    const commandMessages = document.getElementById("command-messages");
    if (!commandMessages) return;
    
    if (isRepeated && commandMessages.lastChild && 
        commandMessages.lastChild.textContent.includes(message)) {
        return;
    }

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", type);
    
    const now = new Date();
    const timestamp = now.toLocaleTimeString();
    
    messageDiv.innerHTML = `
        <span class="timestamp">[${timestamp}]</span>
        <p>${message}</p>
    `;
    
    commandMessages.appendChild(messageDiv);
    commandMessages.scrollTop = commandMessages.scrollHeight;
    
    const maxMessages = 100;
    if (commandMessages.children.length > maxMessages) {
        commandMessages.removeChild(commandMessages.children[0]);
    }
}

// Animation loop with better error handling
let lastTime = 0;
viewer.clock.onTick.addEventListener((clock) => {
    try {
        const currentTime = clock.currentTime.secondsOfDay;
        let deltaTime = currentTime - lastTime;
        
        // Handle time wrap-around (midnight crossing)
        if (deltaTime < 0) {
            deltaTime = 0.016; // Default to 60fps
        }
        
        // Clamp deltaTime to reasonable values
        deltaTime = Math.min(deltaTime, 0.1); // Max 100ms
        
        lastTime = currentTime;
        
        modelManager.updatePhysics(deltaTime);
    } catch (error) {
        console.error('Error in animation loop:', error);
    }
});

// Initialize everything when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    console.log('DOM loaded, initializing application...');
    
    // Load initial drone model
    modelManager.addModel("Default Drone", 3500479, initialLongitude, initialLatitude, initialHeight).then(() => {
        console.log('Default drone loaded, initializing controls...');
        
        initSliderControls();
        initMotorControl();
        initKeyboardControls();
        modelManager.initCameraToggle(); // Initialize camera toggle

        // Search functionality
        const productSearchBtn = document.getElementById("product-search-btn");
        const clearSearchBtn = document.getElementById("clear-search-btn");
        const productSearchInput = document.getElementById("product-search-input");
        
        if (productSearchBtn) {
            productSearchBtn.addEventListener("click", () => {
                const query = productSearchInput ? productSearchInput.value : '';
                addCommandMessage(`Searching for: ${query}`, "system");
            });
        }

        if (clearSearchBtn && productSearchInput) {
            clearSearchBtn.addEventListener("click", () => {
                productSearchInput.value = "";
                addCommandMessage("Search cleared.", "system");
            });
        }

        // Model control buttons
        document.querySelectorAll(".model-control-buttons .control-btn").forEach(button => {
            button.addEventListener("click", (event) => {
                const action = event.currentTarget.dataset.action;
                executeModelCommand(action);
            });
        });

        // Command input field
        const commandInput = document.getElementById("command-input");
        const sendCommandBtn = document.getElementById("send-command-btn");

        function processCommand() {
            if (!commandInput) return;
            const commandText = commandInput.value.trim();
            if (commandText) {
                addCommandMessage(`> ${commandText}`, "command-input");
                executeModelCommand(commandText.toLowerCase());
                commandInput.value = "";
            }
        }

        if (sendCommandBtn) {
            sendCommandBtn.addEventListener("click", processCommand);
        }
        
        if (commandInput) {
            commandInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    processCommand();
                }
            });
        }

        // Go to Location button
        const actionButton = document.getElementById("actionButton");
        if (actionButton) {
            actionButton.textContent = "Return to Start";
            actionButton.addEventListener("click", () => {
                addCommandMessage("Returning to starting location.", "system");
                const activeModel = modelManager.getActiveModel();
                if (activeModel && activeModel.physics) {
                    activeModel.physics.returnHome();
                }
                viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                        initialLongitude, 
                        initialLatitude, 
                        initialHeight + 200
                    ),
                    orientation: {
                        heading: Cesium.Math.toRadians(0),
                        pitch: Cesium.Math.toRadians(-30),
                        roll: 0.0
                    }
                });
            });
        }

        // Event listener for the Add Robot form
        const addRobotForm = document.getElementById("addRobotForm");
        if (addRobotForm) {
            addRobotForm.addEventListener("submit", async (event) => {
                event.preventDefault();

                const robotName = document.getElementById("robotName")?.value;
                const cesiumAssetId = parseInt(document.getElementById("cesiumAssetId")?.value);
                const robotLon = parseFloat(document.getElementById("robotLon")?.value);
                const robotLat = parseFloat(document.getElementById("robotLat")?.value);
                const robotHeight = parseFloat(document.getElementById("robotHeight")?.value);

                if (robotName && !isNaN(cesiumAssetId) && !isNaN(robotLon) && !isNaN(robotLat) && !isNaN(robotHeight)) {
                    const modelId = await modelManager.addModel(robotName, cesiumAssetId, robotLon, robotLat, robotHeight);
                    if (modelId) {
                        addCommandMessage(`Successfully added model: ${robotName} (ID: ${modelId})`, 'system');
                        
                        // Clear the form after successful submission
                        addRobotForm.reset();
                    }
                } else {
                    addCommandMessage('Please fill in all model details correctly.', 'error');
                }
            });
        }
        
        console.log('Application initialization complete');
    }).catch(error => {
        console.error('Error loading default drone:', error);
        addCommandMessage('Error loading default drone model', 'error');
    });
});

// Command execution function for active model
function executeModelCommand(action) {
    const activeModel = modelManager.getActiveModel();
    if (!activeModel) {
        addCommandMessage("No active model selected", "error");
        return;
    }

    if (!activeModel.physics.movementEnabled && action !== "motor") {
        addCommandMessage("Command ignored - motor is not running", "error");
        return;
    }

    const commands = {
        forward: { 
            action: () => activeModel.physics.applyMovement(0, 1.0), 
            message: "Moving forward" 
        },
        backward: { 
            action: () => activeModel.physics.applyMovement(180, 1.0), 
            message: "Moving backward" 
        },
        left: { 
            action: () => activeModel.physics.applyMovement(270, 1.0), 
            message: "Moving left" 
        },
        right: { 
            action: () => activeModel.physics.applyMovement(90, 1.0), 
            message: "Moving right" 
        },
        up: { 
            action: () => {
                activeModel.physics.rotorSpeed = Math.min(3000, activeModel.physics.rotorSpeed + 200);
            }, 
            message: "Increasing altitude" 
        },
        down: { 
            action: () => {
                activeModel.physics.rotorSpeed = Math.max(800, activeModel.physics.rotorSpeed - 200);
            }, 
            message: "Decreasing altitude" 
        },
        hover: { 
            action: () => activeModel.physics.hover(), 
            message: "Hovering" 
        },
        emergency: { 
            action: () => activeModel.physics.emergency(), 
            message: "Emergency stop initiated" 
        },
        home: { 
            action: () => activeModel.physics.returnHome(), 
            message: "Returning home" 
        },
        motor: {
            action: () => {
                if (activeModel.physics.motorRunning) {
                    activeModel.physics.stopMotor();
                    const motorStatus = document.getElementById('motorStatus');
                    const motorButtonText = document.getElementById('motorButtonText');
                    if (motorStatus) motorStatus.textContent = 'OFF';
                    if (motorButtonText) motorButtonText.textContent = 'START MOTOR';
                } else {
                    activeModel.physics.startMotor();
                    const motorStatus = document.getElementById('motorStatus');
                    const motorButtonText = document.getElementById('motorButtonText');
                    if (motorStatus) motorStatus.textContent = 'ON';
                    if (motorButtonText) motorButtonText.textContent = 'STOP MOTOR';
                }
            },
            message: "Motor control"
        }
    };

    const command = commands[action];
    if (command) {
        command.action();
        addCommandMessage(`${command.message} (${activeModel.name}).`, "user");
    } else {
        addCommandMessage(`Unknown command: ${action}`, "error");
    }
}

// Placeholder functions for missing functionality
function changeModelSketch(direction) {
    console.log('Model sketch change:', direction);
}

function saveCodeSnippet() {
    console.log('Save code snippet functionality not implemented');
}

function loadLiveCode() {
    console.log('Load live code functionality not implemented');
}

function copyLiveCode() {
    console.log('Copy live code functionality not implemented');
}

function formatCode() {
    console.log('Format code functionality not implemented');
}

function clearCode() {
    console.log('Clear code functionality not implemented');
}

function loadExample() {
    console.log('Load example functionality not implemented');
}

function runLiveCode() {
    console.log('Run live code functionality not implemented');
}

function debugCode() {
    console.log('Debug code functionality not implemented');
}

function shareCode() {
    console.log('Share code functionality not implemented');
}

function clearOutput() {
    console.log('Clear output functionality not implemented');
}

function optimizeCode() {
    console.log('Optimize code functionality not implemented');
}

function explainCode() {
    console.log('Explain code functionality not implemented');
}
