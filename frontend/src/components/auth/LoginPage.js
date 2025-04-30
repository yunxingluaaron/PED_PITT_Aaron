import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/hooks/useAuth';

const LandingPage = () => {
  // Image slideshow state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Images array - replace with your image paths
  const images = [
    '/images/background1.jpg',
    '/images/background2.jpg',
    '/images/background3.jpg',
    '/images/background4.jpg'
  ];

  // Auth state
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const { login, signup, isLoading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  // Slideshow controls
  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
          setIsTransitioning(false);
        }, 500); // Half of the transition duration
      }, 5000); // Change image every 5 seconds

      return () => clearInterval(interval);
    }
  }, [isPaused, images.length]);

  const togglePlayPause = () => {
    setIsPaused(!isPaused);
  };

  const goToNextImage = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
      setIsTransitioning(false);
    }, 500);
  };

  const goToPrevImage = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prevIndex) => 
        prevIndex === 0 ? images.length - 1 : prevIndex - 1
      );
      setIsTransitioning(false);
    }, 500);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        togglePlayPause();
      }
      if (e.key === 'ArrowRight' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        goToNextImage();
      }
      if (e.key === 'ArrowLeft' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        goToPrevImage();
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Auth handlers
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (isLogin) {
        await login({
          email: formData.email,
          password: formData.password,
        });
      } else {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        await signup({
          email: formData.email,
          password: formData.password,
        });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="relative min-h-screen flex">
      {/* Image Background with Controls */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Background Images */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
          style={{
            backgroundImage: `url(${images[currentImageIndex]})`,
            opacity: isTransitioning ? 0 : 1
          }}
        />
        
        {/* Image Controls */}
        <div className="absolute bottom-4 right-4 flex items-center space-x-2 z-50">
          {/* Previous Button */}
          <button
            onClick={goToPrevImage}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label="Previous image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label={isPaused ? 'Play slideshow' : 'Pause slideshow'}
          >
            {isPaused ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m-9-3a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
            )}
          </button>

          {/* Next Button */}
          <button
            onClick={goToNextImage}
            className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label="Next image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {/* Content section remains the same */}
      <div className="relative flex flex-col lg:flex-row w-full">
        {/* Left side - Landing content */}
        <div className="flex-1 flex flex-col justify-center px-12 text-white">
          <div className="max-w-xl my-16 lg:my-0">
            <h1 className="text-5xl font-bold mb-6">
              Welcome to Your VineAI Pediatric Assistant
            </h1>
            <p className="text-xl mb-8 text-gray-200">
   
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium">Simplify Your Daily Communication Workflow with a Few Clicks</h3>
                  <p className="mt-1 text-gray-300"></p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-lg font-medium">Provide Comprehensive and Halluciation-free and Trackable Response</h3>
                  <p className="mt-1 text-gray-300"></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8 bg-white/90 backdrop-blur-sm p-8 rounded-xl shadow-xl">
            <div>
              <h2 className="text-center text-3xl font-extrabold text-gray-900">
                {isLogin ? 'Sign in to your account' : 'Create your account'}
              </h2>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
                  {error}
                </div>
              )}

              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                {!isLogin && (
                  <div>
                    <label htmlFor="confirmPassword" className="sr-only">Confirm Password</label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  disabled={authLoading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {authLoading ? 'Please wait...' : (isLogin ? 'Sign in' : 'Sign up')}
                </button>
              </div>

              <div className="text-sm text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setFormData({
                      email: '',
                      password: '',
                      confirmPassword: ''
                    });
                  }}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts info */}
      <div className="absolute bottom-4 left-4 text-white/70 text-sm">
        <p>© Powered by PITT & UPMC</p>
      </div>
    </div>
  );
};

export default LandingPage;