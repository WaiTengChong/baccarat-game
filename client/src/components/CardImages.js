// Cross-platform compatible card SVG imports with error handling
let cardImages = {};

// Function to safely load card images with better cross-platform support
const loadCardImages = () => {
  try {
    // Use require for better Windows compatibility
    const loadCard = (path) => {
      try {
        const module = require(path);
        return module.default || module;
      } catch (error) {
        console.warn(`Failed to load card: ${path}`, error);
        return null;
      }
    };

    cardImages = {
      'AS': loadCard('../poker-qr/AS.svg'), 
      'AH': loadCard('../poker-qr/AH.svg'), 
      'AD': loadCard('../poker-qr/AD.svg'), 
      'AC': loadCard('../poker-qr/AC.svg'),
      
      'KS': loadCard('../poker-qr/KS.svg'), 
      'KH': loadCard('../poker-qr/KH.svg'), 
      'KD': loadCard('../poker-qr/KD.svg'), 
      'KC': loadCard('../poker-qr/KC.svg'),
      
      'QS': loadCard('../poker-qr/QS.svg'), 
      'QH': loadCard('../poker-qr/QH.svg'), 
      'QD': loadCard('../poker-qr/QD.svg'), 
      'QC': loadCard('../poker-qr/QC.svg'),
      
      'JS': loadCard('../poker-qr/JS.svg'), 
      'JH': loadCard('../poker-qr/JH.svg'), 
      'JD': loadCard('../poker-qr/JD.svg'), 
      'JC': loadCard('../poker-qr/JC.svg'),
      
      'TS': loadCard('../poker-qr/TS.svg'), 
      'TH': loadCard('../poker-qr/TH.svg'), 
      'TD': loadCard('../poker-qr/TD.svg'), 
      'TC': loadCard('../poker-qr/TC.svg'),
      
      '9S': loadCard('../poker-qr/9S.svg'), 
      '9H': loadCard('../poker-qr/9H.svg'), 
      '9D': loadCard('../poker-qr/9D.svg'), 
      '9C': loadCard('../poker-qr/9C.svg'),
      
      '8S': loadCard('../poker-qr/8S.svg'), 
      '8H': loadCard('../poker-qr/8H.svg'), 
      '8D': loadCard('../poker-qr/8D.svg'), 
      '8C': loadCard('../poker-qr/8C.svg'),
      
      '7S': loadCard('../poker-qr/7S.svg'), 
      '7H': loadCard('../poker-qr/7H.svg'), 
      '7D': loadCard('../poker-qr/7D.svg'), 
      '7C': loadCard('../poker-qr/7C.svg'),
      
      '6S': loadCard('../poker-qr/6S.svg'), 
      '6H': loadCard('../poker-qr/6H.svg'), 
      '6D': loadCard('../poker-qr/6D.svg'), 
      '6C': loadCard('../poker-qr/6C.svg'),
      
      '5S': loadCard('../poker-qr/5S.svg'), 
      '5H': loadCard('../poker-qr/5H.svg'), 
      '5D': loadCard('../poker-qr/5D.svg'), 
      '5C': loadCard('../poker-qr/5C.svg'),
      
      '4S': loadCard('../poker-qr/4S.svg'), 
      '4H': loadCard('../poker-qr/4H.svg'), 
      '4D': loadCard('../poker-qr/4D.svg'), 
      '4C': loadCard('../poker-qr/4C.svg'),
      
      '3S': loadCard('../poker-qr/3S.svg'), 
      '3H': loadCard('../poker-qr/3H.svg'), 
      '3D': loadCard('../poker-qr/3D.svg'), 
      '3C': loadCard('../poker-qr/3C.svg'),
      
      '2S': loadCard('../poker-qr/2S.svg'), 
      '2H': loadCard('../poker-qr/2H.svg'), 
      '2D': loadCard('../poker-qr/2D.svg'), 
      '2C': loadCard('../poker-qr/2C.svg'),
    };

    // Filter out null values and log results
    const successfulCards = Object.entries(cardImages).filter(([key, value]) => value !== null);
    const failedCards = Object.entries(cardImages).filter(([key, value]) => value === null);
    
    console.log(`Card images loaded: ${successfulCards.length}/${Object.keys(cardImages).length}`);
    if (failedCards.length > 0) {
      console.warn('Failed to load cards:', failedCards.map(([key]) => key));
    }
    
    // Log sample paths for debugging
    console.log('Sample card paths:', {
      AS: cardImages.AS ? 'loaded' : 'failed',
      KH: cardImages.KH ? 'loaded' : 'failed',
      QD: cardImages.QD ? 'loaded' : 'failed'
    });

  } catch (error) {
    console.error('Critical error loading card images:', error);
    cardImages = {};
  }
};

// Initialize card images
loadCardImages();

// Helper function to get card image with debugging
export const getCardImage = (cardKey) => {
  const image = cardImages[cardKey];
  if (!image) {
    console.warn(`Card image not found for key: ${cardKey}`);
    console.log('Available card keys:', Object.keys(cardImages).filter(key => cardImages[key]));
  }
  return image;
};

// Export the card images object for backward compatibility
export { cardImages };