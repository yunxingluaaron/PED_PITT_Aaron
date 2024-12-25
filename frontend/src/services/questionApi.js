// src/services/questionApi.js
export const submitQuestion = async (question) => {
    // Implement your API call here
    try {
      // const response = await fetch('/api/question', {
      //   method: 'POST',
      //   body: JSON.stringify({ question })
      // });
      // return await response.json();
      console.log('Question submitted:', question);
    } catch (error) {
      console.error('Error submitting question:', error);
    }
  };