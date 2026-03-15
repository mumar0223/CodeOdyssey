
export const SUPPORTED_LANGUAGES = [
  'JavaScript',
  'Python',
  'Java',
  'C++',
  'TypeScript'
];

export const EXPERIENCE_LEVELS = [
  'Beginner (No coding experience)',
  'Novice (Know basic syntax)',
  'Intermediate (Can solve basic algorithms)',
  'Advanced (Professional experience)'
];

export const MODEL_FAST = 'gemini-3-flash-preview';
export const MODEL_SMART = 'gemini-3-pro-preview';
export const MODEL_IMAGE = 'gemini-2.5-flash-image';
export const MODEL_TTS = 'gemini-2.5-flash-preview-tts';

// AI/ML Specific Constants
export const ML_DOMAINS = [
  { 
    id: 'ml', 
    label: 'Machine Learning', 
    subtopics: [
      'Linear Regression', 
      'Logistic Regression', 
      'Decision Trees', 
      'Random Forests', 
      'K-Nearest Neighbors (KNN)', 
      'K-Means Clustering',
      'SVM (Support Vector Machines)',
      'Dimensionality Reduction (PCA)'
    ] 
  },
  { 
    id: 'dl', 
    label: 'Deep Learning', 
    subtopics: [
      'Neural Networks (Perceptrons)', 
      'CNN (Convolutional Neural Networks)', 
      'RNN (Recurrent Neural Networks)', 
      'LSTM / GRU',
      'Transformers (Attention Mechanism)',
      'GANs (Generative Adversarial Networks)',
      'Autoencoders'
    ] 
  }
];

export const AI_LIBRARIES = [
  'NumPy',
  'Pandas',
  'Scikit-learn',
  'TensorFlow',
  'PyTorch',
  'Keras',
  'OpenCV',
  'Matplotlib'
];

// Libraries that cannot run in Piston (Standard Sandbox)
export const HEAVY_ML_LIBRARIES = [
  'sklearn',
  'scikit-learn',
  'tensorflow',
  'keras',
  'torch',
  'pytorch',
  'cv2',
  'opencv',
  'matplotlib'
];