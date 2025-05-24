import tensorflow as tf
import numpy as np

# Create a simple model - identity function
model = tf.keras.Sequential([
    tf.keras.layers.Input(shape=(1,)),
    tf.keras.layers.Dense(1, use_bias=False, kernel_initializer='ones')
])

# Compile the model (not necessary for conversion, but good practice)
model.compile(optimizer='adam', loss='mse')

# Convert to TensorFlow Lite
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

# Save the model
with open('/Users/ik/dyslexia-app/assets/test-model.tflite', 'wb') as f:
    f.write(tflite_model)

print("Test model created successfully!")
print(f"Model size: {len(tflite_model)} bytes")

# Test the model to ensure it works
interpreter = tf.lite.Interpreter(model_content=tflite_model)
interpreter.allocate_tensors()

# Get input and output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print(f"\nModel details:")
print(f"Input shape: {input_details[0]['shape']}")
print(f"Input dtype: {input_details[0]['dtype']}")
print(f"Output shape: {output_details[0]['shape']}")
print(f"Output dtype: {output_details[0]['dtype']}")

# Test with sample input
test_input = np.array([[1.0]], dtype=np.float32)
interpreter.set_tensor(input_details[0]['index'], test_input)
interpreter.invoke()
output = interpreter.get_tensor(output_details[0]['index'])
print(f"\nTest: Input {test_input[0][0]} -> Output {output[0][0]}")