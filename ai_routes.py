import sqlite3
import time
from flask import Blueprint, request, jsonify
import cohere
import os

ai_bp = Blueprint('ai', __name__, url_prefix='/api')

# Initialize Cohere client
cohere_api_key = os.getenv("COHERE_API_KEY")
co = cohere.Client(cohere_api_key)

# Cache DB path
DB_PATH = "db/ai_cache.db"

def get_cache_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_cache_db():
    conn = get_cache_conn()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS cache (
        prompt TEXT PRIMARY KEY,
        response TEXT,
        timestamp INTEGER
    )
    """)
    conn.commit()
    conn.close()

# Initialize cache table
init_cache_db()

@ai_bp.route("/ask", methods=["POST"])
def ask():
    data = request.json
    prompt = data.get("prompt", "").strip()
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    conn = get_cache_conn()
    cached = conn.execute("SELECT response FROM cache WHERE prompt = ?", (prompt,)).fetchone()

    if cached:
        conn.close()
        return jsonify({"answer": cached["response"], "cached": True})

    try:
        response = co.chat(
            chat_history=[],
            message=prompt,
            model="command-r-plus",
            temperature=0.7
        )
        answer = response.text.strip()

        conn.execute(
            "INSERT OR REPLACE INTO cache (prompt, response, timestamp) VALUES (?, ?, ?)",
            (prompt, answer, int(time.time()))
        )
        conn.commit()
        conn.close()

        return jsonify({"answer": answer, "cached": False})
    except Exception as e:
        conn.close()
        return jsonify({"error": str(e)}), 500
@ai_bp.route("/load_script", methods=["GET"])
def load_script():
    """
    Load the latest content of drone_script.js to show in the code viewer.
    """
    try:
        with open("static/js/drone_script.js", "r", encoding="utf-8") as f:
            content = f.read()
        return jsonify({"content": content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@ai_bp.route("/save_script", methods=["POST"])
def save_script():
    """
    Save the posted code to drone_script.js.
    """
    data = request.json
    code = data.get("code", "")

    try:
        with open("static/js/drone_script.js", "w", encoding="utf-8") as f:
            f.write(code)
        return jsonify({"status": "saved"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
from flask import Blueprint, jsonify, request
import cohere
import os
from dotenv import load_dotenv

load_dotenv()

ai_bp = Blueprint('ai', __name__)

# Initialize Cohere client
cohere_api_key = os.getenv("COHERE_API_KEY")
co = cohere.Client(cohere_api_key) if cohere_api_key else None

@ai_bp.route('/api/ai_code_generate', methods=['POST'])
def ai_code_generate():
    try:
        data = request.json
        prompt = data.get('prompt', '')
        language = data.get('language', 'javascript')
        context = data.get('context', 'general')
        
        if not prompt:
            return jsonify({'error': 'No prompt provided'}), 400
        
        if not co:
            return jsonify({'error': 'Cohere API not configured'}), 500
        
        # Create a detailed prompt for code generation
        system_prompt = f"""You are an expert {language} programmer specializing in {context}. 
Generate clean, well-commented, production-ready code based on the user's request.

Guidelines:
- Write complete, functional code
- Include proper error handling
- Add helpful comments
- Follow best practices for {language}
- Make the code suitable for {context} applications
- If it's for robotics/IoT, include relevant physics or sensor simulation
- Ensure the code is ready to run

User request: {prompt}

Generate {language} code:"""

        # Generate code using Cohere
        response = co.generate(
            model='command-xlarge-nightly',
            prompt=system_prompt,
            max_tokens=1500,
            temperature=0.3,
            k=0,
            stop_sequences=[],
            return_likelihoods='NONE'
        )
        
        generated_code = response.generations[0].text.strip()
        
        # Clean up the generated code
        if generated_code.startswith('```'):
            # Remove markdown code blocks if present
            lines = generated_code.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines[-1].startswith('```'):
                lines = lines[:-1]
            generated_code = '\n'.join(lines)
        
        return jsonify({
            'code': generated_code,
            'language': language,
            'context': context
        })
        
    except Exception as e:
        # Fallback to template-based generation if Cohere fails
        return generate_template_code(prompt, language, context)

def generate_template_code(prompt, language, context):
    """Fallback code generation using templates"""
    prompt_lower = prompt.lower()
    
    # Drone/UAV related code
    if any(keyword in prompt_lower for keyword in ['drone', 'uav', 'quadcopter', 'fly', 'takeoff', 'land']):
        if language == 'javascript':
            code = f"""// {prompt}
class DroneController {{
    constructor(droneId) {{
        this.droneId = droneId;
        this.position = {{x: 0, y: 0, z: 0}};
        this.velocity = {{x: 0, y: 0, z: 0}};
        this.battery = 100;
        this.isFlying = false;
    }}
    
    async takeoff(altitude = 5.0) {{
        console.log(`Drone ${{this.droneId}} taking off to ${{altitude}}m`);
        this.isFlying = true;
        this.position.z = altitude;
        this.battery -= 5;
        return true;
    }}
    
    async move(direction, speed = 1.0) {{
        if (!this.isFlying) {{
            console.log('Cannot move - drone is not flying');
            return false;
        }}
        
        console.log(`Moving ${{direction}} at speed ${{speed}}`);
        
        switch(direction.toLowerCase()) {{
            case 'forward':
                this.position.x += speed;
                break;
            case 'backward':
                this.position.x -= speed;
                break;
            case 'left':
                this.position.y -= speed;
                break;
            case 'right':
                this.position.y += speed;
                break;
            case 'up':
                this.position.z += speed;
                break;
            case 'down':
                this.position.z = Math.max(0, this.position.z - speed);
                break;
        }}
        
        this.battery -= 1;
        return true;
    }}
    
    async land() {{
        console.log(`Drone ${{this.droneId}} landing`);
        this.position.z = 0;
        this.isFlying = false;
        this.battery -= 3;
        return true;
    }}
    
    getStatus() {{
        return {{
            id: this.droneId,
            position: this.position,
            velocity: this.velocity,
            battery: this.battery,
            isFlying: this.isFlying
        }};
    }}
}}

// Example usage
const drone = new DroneController('DRONE_001');
drone.takeoff(10).then(() => {{
    return drone.move('forward', 2);
}}).then(() => {{
    return drone.move('right', 1.5);
}}).then(() => {{
    return drone.land();
}}).then(() => {{
    console.log('Flight complete:', drone.getStatus());
}});"""
        
        elif language == 'python':
            code = f"""# {prompt}
import time
import math
from typing import Dict, Tuple

class DroneController:
    def __init__(self, drone_id: str):
        self.drone_id = drone_id
        self.position = {{'x': 0.0, 'y': 0.0, 'z': 0.0}}
        self.velocity = {{'x': 0.0, 'y': 0.0, 'z': 0.0}}
        self.battery = 100.0
        self.is_flying = False
        self.max_speed = 10.0
        self.max_altitude = 100.0
    
    def takeoff(self, altitude: float = 5.0) -> bool:
        \"\"\"Takeoff to specified altitude\"\"\"
        if altitude > self.max_altitude:
            print(f"Altitude {{altitude}}m exceeds maximum {{self.max_altitude}}m")
            return False
        
        print(f"Drone {{self.drone_id}} taking off to {{altitude}}m")
        self.is_flying = True
        self.position['z'] = altitude
        self.battery -= 5
        return True
    
    def move(self, direction: str, speed: float = 1.0) -> bool:
        \"\"\"Move drone in specified direction\"\"\"
        if not self.is_flying:
            print("Cannot move - drone is not flying")
            return False
        
        if speed > self.max_speed:
            speed = self.max_speed
        
        print(f"Moving {{direction}} at speed {{speed}}")
        
        direction_map = {{
            'forward': ('x', 1),
            'backward': ('x', -1),
            'left': ('y', -1),
            'right': ('y', 1),
            'up': ('z', 1),
            'down': ('z', -1)
        }}
        
        if direction.lower() in direction_map:
            axis, multiplier = direction_map[direction.lower()]
            self.position[axis] += speed * multiplier
            
            # Ensure drone doesn't go below ground
            if axis == 'z' and self.position['z'] < 0:
                self.position['z'] = 0
            
            # Ensure drone doesn't exceed max altitude
            if axis == 'z' and self.position['z'] > self.max_altitude:
                self.position['z'] = self.max_altitude
        
        self.battery -= 1
        return True
    
    def land(self) -> bool:
        \"\"\"Land the drone\"\"\"
        print(f"Drone {{self.drone_id}} landing")
        self.position['z'] = 0
        self.is_flying = False
        self.battery -= 3
        return True
    
    def get_status(self) -> Dict:
        \"\"\"Get current drone status\"\"\"
        return {{
            'id': self.drone_id,
            'position': self.position.copy(),
            'velocity': self.velocity.copy(),
            'battery': self.battery,
            'is_flying': self.is_flying
        }}
    
    def emergency_stop(self) -> bool:
        \"\"\"Emergency landing\"\"\"
        print(f"EMERGENCY STOP - Drone {{self.drone_id}} landing immediately")
        self.position['z'] = 0
        self.is_flying = False
        self.velocity = {{'x': 0.0, 'y': 0.0, 'z': 0.0}}
        return True

# Example usage
if __name__ == "__main__":
    drone = DroneController("DRONE_001")
    
    # Flight sequence
    drone.takeoff(10)
    time.sleep(1)
    
    drone.move('forward', 2.0)
    time.sleep(1)
    
    drone.move('right', 1.5)
    time.sleep(1)
    
    drone.land()
    
    print("Final status:", drone.get_status())"""
    
    # Robot/Robotics related code
    elif any(keyword in prompt_lower for keyword in ['robot', 'arm', 'manipulator', 'servo', 'joint']):
        if language == 'javascript':
            code = f"""// {prompt}
class RobotArmController {{
    constructor(jointCount = 6) {{
        this.jointCount = jointCount;
        this.jointAngles = new Array(jointCount).fill(0);
        this.jointLimits = new Array(jointCount).fill([-180, 180]);
        this.linkLengths = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2].slice(0, jointCount);
        this.isEnabled = false;
    }}
    
    enable() {{
        this.isEnabled = true;
        console.log('Robot arm enabled');
    }}
    
    disable() {{
        this.isEnabled = false;
        console.log('Robot arm disabled');
    }}
    
    setJointAngle(jointIndex, angle) {{
        if (!this.isEnabled) {{
            console.log('Robot arm is disabled');
            return false;
        }}
        
        if (jointIndex < 0 || jointIndex >= this.jointCount) {{
            console.log('Invalid joint index');
            return false;
        }}
        
        const [minAngle, maxAngle] = this.jointLimits[jointIndex];
        if (angle < minAngle || angle > maxAngle) {{
            console.log(`Angle ${{angle}} out of range [${{minAngle}}, ${{maxAngle}}]`);
            return false;
        }}
        
        this.jointAngles[jointIndex] = angle;
        console.log(`Joint ${{jointIndex}} set to ${{angle}} degrees`);
        return true;
    }}
    
    moveToPosition(x, y, z) {{
        if (!this.isEnabled) {{
            console.log('Robot arm is disabled');
            return false;
        }}
        
        console.log(`Moving to position (${{x}}, ${{y}}, ${{z}})`);
        
        // Simple 2D inverse kinematics for demonstration
        const targetDistance = Math.sqrt(x*x + y*y);
        const maxReach = this.linkLengths.reduce((sum, length) => sum + length, 0);
        
        if (targetDistance > maxReach) {{
            console.log('Target position out of reach');
            return false;
        }}
        
        // Calculate joint angles (simplified)
        const angle1 = Math.atan2(y, x) * 180 / Math.PI;
        const angle2 = Math.acos((this.linkLengths[0]**2 + targetDistance**2 - this.linkLengths[1]**2) / 
                                (2 * this.linkLengths[0] * targetDistance)) * 180 / Math.PI;
        
        this.setJointAngle(0, angle1);
        this.setJointAngle(1, angle2);
        
        return true;
    }}
    
    homePosition() {{
        console.log('Moving to home position');
        for (let i = 0; i < this.jointCount; i++) {{
            this.jointAngles[i] = 0;
        }}
        return true;
    }}
    
    getEndEffectorPosition() {{
        let x = 0, y = 0;
        let currentAngle = 0;
        
        for (let i = 0; i < Math.min(2, this.jointCount); i++) {{
            currentAngle += this.jointAngles[i] * Math.PI / 180;
            x += this.linkLengths[i] * Math.cos(currentAngle);
            y += this.linkLengths[i] * Math.sin(currentAngle);
        }}
        
        return {{x: x, y: y, z: 0}};
    }}
    
    getStatus() {{
        return {{
            jointCount: this.jointCount,
            jointAngles: [...this.jointAngles],
            endEffectorPosition: this.getEndEffectorPosition(),
            isEnabled: this.isEnabled
        }};
    }}
}}

// Example usage
const robot = new RobotArmController(6);
robot.enable();
robot.moveToPosition(1.5, 1.0, 0);
console.log('Robot status:', robot.getStatus());
robot.homePosition();"""
        
        elif language == 'python':
            code = f"""# {prompt}
import math
import numpy as np
from typing import List, Tuple, Dict

class RobotArmController:
    def __init__(self, joint_count: int = 6):
        self.joint_count = joint_count
        self.joint_angles = [0.0] * joint_count
        self.joint_limits = [(-180, 180)] * joint_count
        self.link_lengths = [1.0, 0.8, 0.6, 0.4, 0.3, 0.2][:joint_count]
        self.is_enabled = False
    
    def enable(self) -> None:
        \"\"\"Enable the robot arm\"\"\"
        self.is_enabled = True
        print("Robot arm enabled")
    
    def disable(self) -> None:
        \"\"\"Disable the robot arm\"\"\"
        self.is_enabled = False
        print("Robot arm disabled")
    
    def set_joint_angle(self, joint_index: int, angle: float) -> bool:
        \"\"\"Set angle for a specific joint\"\"\"
        if not self.is_enabled:
            print("Robot arm is disabled")
            return False
        
        if joint_index < 0 or joint_index >= self.joint_count:
            print("Invalid joint index")
            return False
        
        min_angle, max_angle = self.joint_limits[joint_index]
        if angle < min_angle or angle > max_angle:
            print(f"Angle {{angle}} out of range [{{min_angle}}, {{max_angle}}]")
            return False
        
        self.joint_angles[joint_index] = angle
        print(f"Joint {{joint_index}} set to {{angle}} degrees")
        return True
    
    def move_to_position(self, x: float, y: float, z: float) -> bool:
        \"\"\"Move end effector to specified position using inverse kinematics\"\"\"
        if not self.is_enabled:
            print("Robot arm is disabled")
            return False
        
        print(f"Moving to position ({{x}}, {{y}}, {{z}})")
        
        # Simple 2D inverse kinematics
        target_distance = math.sqrt(x**2 + y**2)
        max_reach = sum(self.link_lengths)
        
        if target_distance > max_reach:
            print("Target position out of reach")
            return False
        
        # Calculate joint angles (simplified 2D case)
        try:
            angle1 = math.atan2(y, x)
            
            # Law of cosines for second joint
            cos_angle2 = (self.link_lengths[0]**2 + target_distance**2 - self.link_lengths[1]**2) / \\
                        (2 * self.link_lengths[0] * target_distance)
            
            if abs(cos_angle2) > 1:
                print("Target position unreachable with current configuration")
                return False
            
            angle2 = math.acos(cos_angle2)
            
            self.set_joint_angle(0, math.degrees(angle1))
            self.set_joint_angle(1, math.degrees(angle2))
            
            return True
        
        except (ValueError, ZeroDivisionError) as e:
            print(f"Inverse kinematics calculation failed: {{e}}")
            return False
    
    def home_position(self) -> bool:
        \"\"\"Move to home position (all joints at 0 degrees)\"\"\"
        print("Moving to home position")
        for i in range(self.joint_count):
            self.joint_angles[i] = 0.0
        return True
    
    def get_end_effector_position(self) -> Dict[str, float]:
        \"\"\"Calculate end effector position using forward kinematics\"\"\"
        x, y = 0.0, 0.0
        current_angle = 0.0
        
        for i in range(min(2, self.joint_count)):
            current_angle += math.radians(self.joint_angles[i])
            x += self.link_lengths[i] * math.cos(current_angle)
            y += self.link_lengths[i] * math.sin(current_angle)
        
        return {{'x': x, 'y': y, 'z': 0.0}}
    
    def get_status(self) -> Dict:
        \"\"\"Get current robot status\"\"\"
        return {{
            'joint_count': self.joint_count,
            'joint_angles': self.joint_angles.copy(),
            'end_effector_position': self.get_end_effector_position(),
            'is_enabled': self.is_enabled
        }}

# Example usage
if __name__ == "__main__":
    robot = RobotArmController(6)
    robot.enable()
    
    # Move to a position
    robot.move_to_position(1.5, 1.0, 0)
    print("Robot status:", robot.get_status())
    
    # Return to home
    robot.home_position()
    print("End effector position:", robot.get_end_effector_position())"""
    
    # Sensor/IoT related code
    elif any(keyword in prompt_lower for keyword in ['sensor', 'iot', 'temperature', 'humidity', 'data']):
        if language == 'javascript':
            code = f"""// {prompt}
class IoTSensorManager {{
    constructor() {{
        this.sensors = new Map();
        this.isRunning = false;
        this.dataLog = [];
    }}
    
    addSensor(sensorId, sensorType, config = {{}}) {{
        const sensor = {{
            id: sensorId,
            type: sensorType,
            config: config,
            lastReading: null,
            isActive: true,
            readingCount: 0
        }};
        
        this.sensors.set(sensorId, sensor);
        console.log(`Added sensor: ${{sensorId}} (type: ${{sensorType}})`);
        return sensor;
    }}
    
    readSensor(sensorId) {{
        const sensor = this.sensors.get(sensorId);
        if (!sensor || !sensor.isActive) {{
            return null;
        }}
        
        let reading;
        const timestamp = Date.now();
        
        // Simulate different sensor types
        switch (sensor.type) {{
            case 'temperature':
                reading = {{
                    value: 20 + Math.random() * 15 + Math.sin(timestamp / 10000) * 5,
                    unit: '°C'
                }};
                break;
            
            case 'humidity':
                reading = {{
                    value: 40 + Math.random() * 40 + Math.cos(timestamp / 15000) * 10,
                    unit: '%'
                }};
                break;
            
            case 'pressure':
                reading = {{
                    value: 1013.25 + Math.random() * 10 - 5,
                    unit: 'hPa'
                }};
                break;
            
            case 'motion':
                reading = {{
                    detected: Math.random() > 0.7,
                    confidence: Math.random()
                }};
                break;
            
            default:
                reading = {{
                    value: Math.random() * 100,
                    unit: 'units'
                }};
        }}
        
        reading.timestamp = timestamp;
        reading.sensorId = sensorId;
        
        sensor.lastReading = reading;
        sensor.readingCount++;
        
        return reading;
    }}
    
    startMonitoring(interval = 1000) {{
        if (this.isRunning) {{
            console.log('Monitoring already running');
            return;
        }}
        
        this.isRunning = true;
        console.log('Starting sensor monitoring...');
        
        this.monitoringInterval = setInterval(() => {{
            this.sensors.forEach((sensor, sensorId) => {{
                if (sensor.isActive) {{
                    const reading = this.readSensor(sensorId);
                    if (reading) {{
                        this.dataLog.push(reading);
                        console.log(`${{sensorId}}: ${{JSON.stringify(reading)}}`);
                    }}
                }}
            }});
            
            // Keep only last 1000 readings
            if (this.dataLog.length > 1000) {{
                this.dataLog = this.dataLog.slice(-1000);
            }}
        }}, interval);
    }}
    
    stopMonitoring() {{
        if (!this.isRunning) {{
            console.log('Monitoring not running');
            return;
        }}
        
        clearInterval(this.monitoringInterval);
        this.isRunning = false;
        console.log('Sensor monitoring stopped');
    }}
    
    getRecentData(sensorId, count = 10) {{
        return this.dataLog
            .filter(reading => reading.sensorId === sensorId)
            .slice(-count);
    }}
    
    getSensorStatus() {{
        const status = {{}};
        this.sensors.forEach((sensor, sensorId) => {{
            status[sensorId] = {{
                type: sensor.type,
                isActive: sensor.isActive,
                readingCount: sensor.readingCount,
                lastReading: sensor.lastReading
            }};
        }});
        return status;
    }}
}}

// Example usage
const sensorManager = new IoTSensorManager();

// Add sensors
sensorManager.addSensor('temp_01', 'temperature');
sensorManager.addSensor('humid_01', 'humidity');
sensorManager.addSensor('motion_01', 'motion');

// Start monitoring
sensorManager.startMonitoring(2000); // Every 2 seconds

// Check status after some time
setTimeout(() => {{
    console.log('Sensor Status:', sensorManager.getSensorStatus());
    console.log('Recent temperature data:', sensorManager.getRecentData('temp_01', 5));
}}, 10000);"""
        
        elif language == 'python':
            code = f"""# {prompt}
import time
import random
import math
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

class IoTSensorManager:
    def __init__(self):
        self.sensors = {{}}
        self.is_running = False
        self.data_log = []
        self.monitoring_thread = None
    
    def add_sensor(self, sensor_id: str, sensor_type: str, config: Dict = None) -> Dict:
        \"\"\"Add a new sensor to the manager\"\"\"
        if config is None:
            config = {{}}
        
        sensor = {{
            'id': sensor_id,
            'type': sensor_type,
            'config': config,
            'last_reading': None,
            'is_active': True,
            'reading_count': 0
        }}
        
        self.sensors[sensor_id] = sensor
        print(f"Added sensor: {{sensor_id}} (type: {{sensor_type}})")
        return sensor
    
    def read_sensor(self, sensor_id: str) -> Optional[Dict]:
        \"\"\"Read data from a specific sensor\"\"\"
        sensor = self.sensors.get(sensor_id)
        if not sensor or not sensor['is_active']:
            return None
        
        timestamp = time.time()
        
        # Simulate different sensor types
        if sensor['type'] == 'temperature':
            reading = {{
                'value': round(20 + random.uniform(-5, 15) + math.sin(timestamp / 100) * 5, 2),
                'unit': '°C'
            }}
        
        elif sensor['type'] == 'humidity':
            reading = {{
                'value': round(max(0, min(100, 40 + random.uniform(-20, 40) + math.cos(timestamp / 150) * 10)), 1),
                'unit': '%'
            }}
        
        elif sensor['type'] == 'pressure':
            reading = {{
                'value': round(1013.25 + random.uniform(-10, 10), 2),
                'unit': 'hPa'
            }}
        
        elif sensor['type'] == 'motion':
            reading = {{
                'detected': random.random() > 0.7,
                'confidence': round(random.random(), 3)
            }}
        
        elif sensor['type'] == 'light':
            reading = {{
                'value': round(random.uniform(0, 1000), 1),
                'unit': 'lux'
            }}
        
        else:
            reading = {{
                'value': round(random.uniform(0, 100), 2),
                'unit': 'units'
            }}
        
        reading.update({{
            'timestamp': timestamp,
            'sensor_id': sensor_id,
            'datetime': datetime.fromtimestamp(timestamp).isoformat()
        }})
        
        sensor['last_reading'] = reading
        sensor['reading_count'] += 1
        
        return reading
    
    def start_monitoring(self, interval: float = 1.0) -> None:
        \"\"\"Start continuous sensor monitoring\"\"\"
        if self.is_running:
            print("Monitoring already running")
            return
        
        self.is_running = True
        print("Starting sensor monitoring...")
        
        import threading
        
        def monitor():
            while self.is_running:
                for sensor_id, sensor in self.sensors.items():
                    if sensor['is_active']:
                        reading = self.read_sensor(sensor_id)
                        if reading:
                            self.data_log.append(reading)
                            print(f"{{sensor_id}}: {{json.dumps(reading, indent=2)}}")
                
                # Keep only last 1000 readings
                if len(self.data_log) > 1000:
                    self.data_log = self.data_log[-1000:]
                
                time.sleep(interval)
        
        self.monitoring_thread = threading.Thread(target=monitor, daemon=True)
        self.monitoring_thread.start()
    
    def stop_monitoring(self) -> None:
        \"\"\"Stop sensor monitoring\"\"\"
        if not self.is_running:
            print("Monitoring not running")
            return
        
        self.is_running = False
        print("Sensor monitoring stopped")
    
    def get_recent_data(self, sensor_id: str, count: int = 10) -> List[Dict]:
        \"\"\"Get recent data from a specific sensor\"\"\"
        return [reading for reading in self.data_log 
                if reading['sensor_id'] == sensor_id][-count:]
    
    def get_sensor_status(self) -> Dict:
        \"\"\"Get status of all sensors\"\"\"
        status = {{}}
        for sensor_id, sensor in self.sensors.items():
            status[sensor_id] = {{
                'type': sensor['type'],
                'is_active': sensor['is_active'],
                'reading_count': sensor['reading_count'],
                'last_reading': sensor['last_reading']
            }}
        return status
    
    def export_data(self, filename: str = None) -> str:
        \"\"\"Export sensor data to JSON file\"\"\"
        if filename is None:
            filename = f"sensor_data_{{datetime.now().strftime('%Y%m%d_%H%M%S')}}.json"
        
        export_data = {{
            'export_timestamp': datetime.now().isoformat(),
            'sensors': self.sensors,
            'data_log': self.data_log
        }}
        
        with open(filename, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"Data exported to {{filename}}")
        return filename

# Example usage
if __name__ == "__main__":
    sensor_manager = IoTSensorManager()
    
    # Add sensors
    sensor_manager.add_sensor('temp_01', 'temperature')
    sensor_manager.add_sensor('humid_01', 'humidity')
    sensor_manager.add_sensor('motion_01', 'motion')
    sensor_manager.add_sensor('light_01', 'light')
    
    # Start monitoring
    sensor_manager.start_monitoring(2.0)  # Every 2 seconds
    
    # Let it run for a while
    time.sleep(10)
    
    # Check status
    print("\\nSensor Status:")
    status = sensor_manager.get_sensor_status()
    for sensor_id, info in status.items():
        print(f"{{sensor_id}}: {{info['reading_count']}} readings")
    
    # Get recent data
    print("\\nRecent temperature data:")
    recent_temp = sensor_manager.get_recent_data('temp_01', 5)
    for reading in recent_temp:
        print(f"{{reading['datetime']}}: {{reading['value']}}{{reading['unit']}}")
    
    # Stop monitoring
    sensor_manager.stop_monitoring()"""
    
    # General/Loop related code
    elif any(keyword in prompt_lower for keyword in ['loop', 'for', 'while', 'iterate', 'count']):
        if language == 'javascript':
            code = f"""// {prompt}
console.log('Starting loop demonstration...');

// Basic for loop from 1 to 10
console.log('\\n=== Basic For Loop (1 to 10) ===');
for (let i = 1; i <= 10; i++) {{
    console.log(`Count: ${{i}}`);
}}

// Enhanced loop with additional functionality
console.log('\\n=== Enhanced Loop with Calculations ===');
let sum = 0;
let squares = [];

for (let i = 1; i <= 10; i++) {{
    sum += i;
    squares.push(i * i);
    
    console.log(`Number: ${{i}}, Square: ${{i * i}}, Running Sum: ${{sum}}`);
}}

console.log(`\\nFinal Sum: ${{sum}}`);
console.log(`Squares Array: [${{squares.join(', ')}}]`);

// Different loop types
console.log('\\n=== Different Loop Types ===');

// While loop
console.log('While loop countdown:');
let countdown = 5;
while (countdown > 0) {{
    console.log(`T-minus ${{countdown}}`);
    countdown--;
}}
console.log('Blast off! 🚀');

// For...of loop with array
console.log('\\nFor...of loop with array:');
const fruits = ['apple', 'banana', 'orange', 'grape'];
for (const fruit of fruits) {{
    console.log(`Fruit: ${{fruit}}`);
}}

// For...in loop with object
console.log('\\nFor...in loop with object:');
const person = {{
    name: 'John',
    age: 30,
    city: 'New York'
}};

for (const key in person) {{
    console.log(`${{key}}: ${{person[key]}}`);
}}

console.log('\\nLoop demonstration complete!');"""
        
        elif language == 'python':
            code = f"""# {prompt}
print("Starting loop demonstration...")

# Basic for loop from 1 to 10
print("\\n=== Basic For Loop (1 to 10) ===")
for i in range(1, 11):
    print(f"Count: {{i}}")

# Enhanced loop with additional functionality
print("\\n=== Enhanced Loop with Calculations ===")
total_sum = 0
squares = []

for i in range(1, 11):
    total_sum += i
    square = i ** 2
    squares.append(square)
    
    print(f"Number: {{i}}, Square: {{square}}, Running Sum: {{total_sum}}")

print(f"\\nFinal Sum: {{total_sum}}")
print(f"Squares List: {{squares}}")

# Different loop types
print("\\n=== Different Loop Types ===")

# While loop
print("While loop countdown:")
countdown = 5
while countdown > 0:
    print(f"T-minus {{countdown}}")
    countdown -= 1
print("Blast off! 🚀")

# For loop with list
print("\\nFor loop with list:")
fruits = ['apple', 'banana', 'orange', 'grape']
for fruit in fruits:
    print(f"Fruit: {{fruit}}")

# For loop with enumerate
print("\\nFor loop with enumerate:")
for index, fruit in enumerate(fruits, 1):
    print(f"{{index}}. {{fruit}}")

# For loop with dictionary
print("\\nFor loop with dictionary:")
person = {{
    'name': 'John',
    'age': 30,
    'city': 'New York'
}}

for key, value in person.items():
    print(f"{{key}}: {{value}}")

# List comprehension (Pythonic way)
print("\\n=== List Comprehensions ===")
squares_comp = [i**2 for i in range(1, 11)]
print(f"Squares using list comprehension: {{squares_comp}}")

even_squares = [i**2 for i in range(1, 11) if i % 2 == 0]
print(f"Even number squares: {{even_squares}}")

print("\\nLoop demonstration complete!")"""
    
    # Default general code
    else:
        if language == 'javascript':
            code = f"""// {prompt}
console.log('AI Generated Code');

function main() {{
    console.log('Hello from AI Code Developer!');
    
    // Your custom logic based on: {prompt}
    const result = processRequest();
    
    console.log('Result:', result);
    return result;
}}

function processRequest() {{
    // Process your request here
    const data = {{
        message: 'Code generated successfully',
        timestamp: new Date().toISOString(),
        prompt: '{prompt}'
    }};
    
    return data;
}}

// Execute main function
main();"""
        
        elif language == 'python':
            code = f"""# {prompt}
from datetime import datetime

def main():
    \"\"\"Main function\"\"\"
    print("AI Generated Code")
    print("Hello from AI Code Developer!")
    
    # Your custom logic based on: {prompt}
    result = process_request()
    
    print("Result:", result)
    return result

def process_request():
    \"\"\"Process your request here\"\"\"
    data = {{
        'message': 'Code generated successfully',
        'timestamp': datetime.now().isoformat(),
        'prompt': '{prompt}'
    }}
    
    return data

if __name__ == "__main__":
    main()"""
        
        else:
            code = f"// {prompt}\n// Generated {language} code\nconsole.log('Hello from AI Code Developer!');"
    
    return jsonify({
        'code': code,
        'language': language,
        'context': context,
        'generated_by': 'template_fallback'
    })

@ai_bp.route('/api/ai_code_optimize', methods=['POST'])
def ai_code_optimize():
    try:
        data = request.json
        code = data.get('code', '')
        language = data.get('language', 'javascript')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        if not co:
            return jsonify({'error': 'Cohere API not configured'}), 500
        
        # Create optimization prompt
        optimization_prompt = f"""You are an expert {language} programmer. Optimize the following code for better performance, readability, and best practices.

Original code:
```{language}
{code}
```

Please provide optimized code with:
1. Better performance
2. Improved readability
3. Best practices implementation
4. Proper error handling
5. Clear comments explaining optimizations

Optimized {language} code:"""

        response = co.generate(
            model='command-xlarge-nightly',
            prompt=optimization_prompt,
            max_tokens=1500,
            temperature=0.2,
            k=0,
            stop_sequences=[],
            return_likelihoods='NONE'
        )
        
        optimized_code = response.generations[0].text.strip()
        
        # Clean up the generated code
        if optimized_code.startswith('```'):
            lines = optimized_code.split('\n')
            if lines[0].startswith('```'):
                lines = lines[1:]
            if lines[-1].startswith('```'):
                lines = lines[:-1]
            optimized_code = '\n'.join(lines)
        
        return jsonify({
            'code': optimized_code,
            'language': language
        })
        
    except Exception as e:
        # Fallback optimization
        optimized_code = f"// Optimized code\n{code.replace('console.log', 'console.info')}"
        return jsonify({
            'code': optimized_code,
            'language': language,
            'optimized_by': 'fallback'
        })

@ai_bp.route('/api/ai_code_explain', methods=['POST'])
def ai_code_explain():
    try:
        data = request.json
        code = data.get('code', '')
        language = data.get('language', 'javascript')
        
        if not code:
            return jsonify({'error': 'No code provided'}), 400
        
        if not co:
            return jsonify({'error': 'Cohere API not configured'}), 500
        
        # Create explanation prompt
        explanation_prompt = f"""You are an expert {language} programmer and teacher. Explain the following code in detail:

```{language}
{code}
```

Please provide:
1. Overall purpose and functionality
2. Line-by-line explanation of key parts
3. Explanation of algorithms or patterns used
4. Potential improvements or considerations
5. Use cases and applications

Detailed explanation:"""

        response = co.generate(
            model='command-xlarge-nightly',
            prompt=explanation_prompt,
            max_tokens=1000,
            temperature=0.3,
            k=0,
            stop_sequences=[],
            return_likelihoods='NONE'
        )
        
        explanation = response.generations[0].text.strip()
        
        return jsonify({
            'explanation': explanation,
            'language': language
        })
        
    except Exception as e:
        # Fallback explanation
        explanation = f"This {language} code snippet performs the following operations: {code[:100]}..."
        return jsonify({
            'explanation': explanation,
            'language': language,
            'explained_by': 'fallback'
        })

@ai_bp.route('/api/save_script', methods=['POST'])
def save_script():
    data = request.json
    code = data.get('code', '')
    try:
        with open('static/drone_script.js', 'w') as f:
            f.write(code)
        return jsonify({'status': 'saved'})
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500


