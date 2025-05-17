// Setup Alpine.js store for app state
document.addEventListener("alpine:init", () => {
  Alpine.store("app", {
    disclaimerAccepted: localStorage.getItem("disclaimerAccepted") === "true",
  });
});

// We'll load NekoAI library dynamically once the DOM is ready
let NovelAI, Model, Resolution, Sampler, Noise, Action, createCustomHost;

// Setup IndexedDB
const DB_NAME = "nyanovel-images";
const DB_VERSION = 1;
const STORE_NAME = "images";

// Initialize the database
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Error opening database:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Load images from IndexedDB
async function loadImagesFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error("Error loading images:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Fix the saveImageToDB function to handle proxy objects properly
async function saveImageToDB(image) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    // Create a clean copy of the image object without proxies
    const cleanImage = {
      dataUrl: image.dataUrl,
      timestamp: image.timestamp,
      filename: image.filename,
      settings: JSON.parse(JSON.stringify(image.settings || {})), // Safely clone settings
    };

    const request = store.add(cleanImage);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = (event) => {
      console.error("Error saving image:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Delete image from IndexedDB
async function deleteImageFromDB(imageId) {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(imageId);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error deleting image:", event.target.error);
      reject(event.target.error);
    };
  });
}

// Clear all images from IndexedDB
async function clearAllImagesFromDB() {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error clearing images:", event.target.error);
      reject(event.target.error);
    };
  });
}

// First load the NekoAI library
function loadNekoAILibrary() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://cdn.jsdelivr.net/npm/nekoai-js/dist/index.min.mjs";
    script.onload = () => {
      // When loaded, make the library available globally
      import("https://cdn.jsdelivr.net/npm/nekoai-js/dist/index.min.mjs")
        .then((module) => {
          window.NovelAI = module.NovelAI;
          window.Model = module.Model;
          window.Resolution = module.Resolution;
          window.Sampler = module.Sampler;
          window.Noise = module.Noise;
          window.Action = module.Action;
          window.createCustomHost = module.createCustomHost; // Expose createCustomHost
          NovelAI = module.NovelAI;
          Model = module.Model;
          Resolution = module.Resolution;
          Sampler = module.Sampler;
          Noise = module.Noise;
          Action = module.Action;
          createCustomHost = module.createCustomHost; // Assign to local variable
          resolve();
        })
        .catch((error) => {
          console.error("Error importing NekoAI library:", error);
          reject(error);
        });
    };
    script.onerror = () => {
      console.error("Failed to load NekoAI library");
      reject(new Error("Failed to load NekoAI library"));
    };
    document.head.appendChild(script);
  });
}

// Define the Alpine.js data function
function imageGenerator() {
  return {
    // State
    token: localStorage.getItem("nai-token") || "",
    serverUrl: localStorage.getItem("nai-server") || "https://image.novelai.net",

    // Helper method for creating custom host
    createCustomHostInstance() {
      if (this.serverUrl && this.serverUrl !== "https://image.novelai.net") {
        return window.createCustomHost(this.serverUrl, "binary/octet-stream");
      }
      return undefined;
    },

    darkMode: localStorage.getItem("darkMode") === "true" || (localStorage.getItem("darkMode") === null && window.matchMedia("(prefers-color-scheme: dark)").matches),
    showServerModal: false,
    showDirectorTools: false,
    showEmotionControls: false,
    showColorizeControls: false, // Added for colorize tool
    isGenerating: false,
    isDirectorProcessing: false,
    images: [],
    selectedImageIndex: null,
    selectedImage: null,
    processedImage: null,
    client: null,
    settingsCollapsed: false,
    galleryExpanded: false,
    galleryHovered: false,
    activeSettingsTab: "basic",
    vibeTransferImage: null,
    vibeTransferFile: null,
    themeTransitioning: false,

    // Retry Configuration
    retryConfig: {
      maxRetries: 3,
      baseDelay: 2000,
    },

    // Generation settings
    generationSettings: {
      prompt: "",
      // This will be the global "Undesired Content"
      negativePrompt: "",
      model: "nai-diffusion-4-full",
      resPreset: "normal_portrait",
      steps: 28,
      seed: -1,
      sampler: "k_euler_ancestral", // Changed default sampler
      scale: 5.5, // Will be "Prompt Guidance"
      action: "generate",
      ucPreset: 0, // 0: Heavy, 1: Light, 2: None
      qualityToggle: true,
      nSamples: 1, // Batch Size
      dynamicThresholding: false,
      cfgRescale: 0, // Will be "Prompt Guidance Rescale"
      noiseSchedule: "karras",
      controlnetStrength: 1,
      addOriginalImage: true,
      autoSmea: false,
      characterPrompts: [], // Each item: { prompt: "", uc: "", center: { x: 0.5, y: 0.5 }, enabled: true }
    },

    // Emotion change options
    emotionOptions: {
      emotion: "neutral", // Default to neutral
      prompt: "", // Default to empty, placeholder in HTML will guide
      emotionLevel: 0, // Default to Normal
    },

    // Colorize tool options
    colorizeOptions: {
      prompt: "",
      defry: 0,
    },

    // Auto-resize textarea based on content
    autoResizeTextarea(textarea) {
      if (!textarea) return;

      // Reset height to get the correct scrollHeight
      textarea.style.height = "auto";

      // Set the height to match content (with a max height)
      const maxHeight = 250; // Maximum height in pixels
      const minHeight = 100; // Minimum height in pixels
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.max(minHeight, Math.min(scrollHeight, maxHeight)) + "px";

      // If content exceeds max height, enable scrolling
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    },

    // Apply theme to HTML element with smooth transition
    applyTheme() {
      // Set transitioning state
      this.themeTransitioning = true;

      // Apply the appropriate class to the HTML element
      if (this.darkMode) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }

      // Add transition class for smooth theme change
      document.documentElement.classList.add("theme-transitioning");

      // Force a repaint to ensure all components update their styles
      document.body.style.display = "none";
      document.body.offsetHeight; // Trigger a reflow
      document.body.style.display = "";

      // Auto-resize all textareas after theme change
      setTimeout(() => {
        document.querySelectorAll("textarea").forEach((textarea) => {
          this.autoResizeTextarea(textarea);
        });

        // Remove transition class and set transitioning state to false
        document.documentElement.classList.remove("theme-transitioning");
        this.themeTransitioning = false;
      }, 300);
    },

    // Listen for system theme changes
    setupThemeListener() {
      // Only set up the listener if the user hasn't explicitly set a preference
      if (localStorage.getItem("darkMode") === null) {
        window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
          this.darkMode = e.matches;
          this.applyTheme();
        });
      }
    },

    // Initialization
    async init() {
      console.log("Initializing NyaNovel image generator...");

      // Check if the disclaimer has been accepted before
      const disclaimerAccepted = localStorage.getItem("disclaimerAccepted");
      if (disclaimerAccepted === "true") {
        // Hide the disclaimer if it has been accepted
        this.$nextTick(() => {
          const disclaimerElement = document.querySelector(".z-\\[60\\]");
          if (disclaimerElement) {
            // Access the Alpine.js data
            const disclaimerData = Alpine.data(disclaimerElement);
            if (disclaimerData && disclaimerData.show !== undefined) {
              disclaimerData.show = false;
            }
          }
        });
      }

      // Apply theme immediately
      this.applyTheme();

      // Set up theme listener for system preference changes
      this.setupThemeListener();

      // Set up event listeners for gallery expansion
      document.addEventListener("mousemove", (e) => {
        const galleryPanel = document.querySelector(".gallery-panel");
        if (!galleryPanel) return;

        const rect = galleryPanel.getBoundingClientRect();
        const isHovering =
          e.clientX >= rect.left - 20 && // Add a small buffer zone
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;

        if (isHovering !== this.galleryHovered) {
          this.galleryHovered = isHovering;
          if (isHovering) {
            this.galleryExpanded = true;
          } else {
            setTimeout(() => {
              if (!this.galleryHovered) {
                this.galleryExpanded = false;
              }
            }, 300);
          }
        }
      });

      // Auto-resize textareas on initial load
      setTimeout(() => {
        document.querySelectorAll("textarea").forEach((textarea) => {
          this.autoResizeTextarea(textarea);
        });
      }, 100);

      try {
        // Load NekoAI library
        await loadNekoAILibrary();

        // Load retry config from localStorage
        this.retryConfig.maxRetries = parseInt(localStorage.getItem("nai-retryMaxRetries")) || 3;
        this.retryConfig.baseDelay = parseInt(localStorage.getItem("nai-retryBaseDelay")) || 2000;

        // Initialize client if token exists
        if (this.token) {
          this.initClient();
        } else {
          // Show server configuration modal if no token is found
          this.showServerModal = true;
        }

        // Load images from IndexedDB
        try {
          this.images = await loadImagesFromDB();
          if (this.images.length > 0) {
            this.selectImage(0);
          }
        } catch (error) {
          console.error("Failed to load images:", error);
        }
      } catch (error) {
        console.error("Initialization error:", error);
        alert("There was an error initializing the application. Please check the console for details.");
      }
    },

    // Initialize the NovelAI client
    initClient() {
      if (!window.NovelAI) {
        console.error("NovelAI library not loaded yet");
        return;
      }
      this.client = new window.NovelAI({
        token: this.token,
        // customHost removed here, will be handled per-call for specific methods
        retry: {
          enabled: true,
          maxRetries: parseInt(this.retryConfig.maxRetries) || 3,
          baseDelay: parseInt(this.retryConfig.baseDelay) || 2000,
          maxDelay: 60000, // Fixed as per feedback
          retryStatusCodes: [429], // Fixed as per feedback
        },
      });
    },

    // Save server configuration
    saveServerConfig() {
      localStorage.setItem("nai-token", this.token);
      localStorage.setItem("nai-server", this.serverUrl);
      localStorage.setItem("nai-retryMaxRetries", this.retryConfig.maxRetries.toString());
      localStorage.setItem("nai-retryBaseDelay", this.retryConfig.baseDelay.toString());
      this.initClient();
      this.showServerModal = false;
    },

    // Toggle dark mode
    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem("darkMode", this.darkMode.toString());
      this.applyTheme();
    },

    // Add a character to the character prompts
    addCharacter() {
      this.generationSettings.characterPrompts.push({
        prompt: "",
        uc: "",
        center: { x: 0.5, y: 0.5 },
        enabled: true,
      });
    },

    // Remove a character from the character prompts
    removeCharacter(index) {
      this.generationSettings.characterPrompts.splice(index, 1);
    },

    // Handle vibe transfer image upload
    handleVibeTransferUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Store the file directly, not as a proxy
      this.vibeTransferFile = file;

      const reader = new FileReader();
      reader.onload = (e) => {
        this.vibeTransferImage = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    // Clear vibe transfer image
    clearVibeTransfer(event) {
      event.preventDefault();
      event.stopPropagation();
      this.vibeTransferImage = null;
      this.vibeTransferFile = null;
      document.getElementById("vibe-transfer-file").value = "";
    },

    // Fix the generateImage function to handle settings properly
    async generateImage() {
      if (!this.client) {
        this.showServerModal = true;
        return;
      }

      this.isGenerating = true;

      try {
        const seed = this.generationSettings.seed === -1 ? Math.floor(Math.random() * 4294967295) : this.generationSettings.seed;

        // Prepare generation parameters - create a clean copy without proxies
        const params = {
          prompt: this.generationSettings.prompt,
          negativePrompt: this.generationSettings.negativePrompt,
          model: this.generationSettings.model,
          resPreset: this.generationSettings.resPreset,
          steps: Number(this.generationSettings.steps),
          seed: Number(seed),
          sampler: this.generationSettings.sampler,
          scale: Number(this.generationSettings.scale),
          nSamples: Number(this.generationSettings.nSamples),
          ucPreset: Number(this.generationSettings.ucPreset),
          qualityToggle: Boolean(this.generationSettings.qualityToggle),
          dynamicThresholding: Boolean(this.generationSettings.dynamicThresholding),
          cfgRescale: Number(this.generationSettings.cfgRescale),
          noiseSchedule: this.generationSettings.noiseSchedule,
          autoSmea: Boolean(this.generationSettings.autoSmea),
        };

        // Add character prompts if available - create clean copies
        if (this.generationSettings.characterPrompts && this.generationSettings.characterPrompts.length > 0) {
          const processedCharPrompts = this.generationSettings.characterPrompts
            .filter((char) => char.enabled && String(char.prompt || "").trim()) // Only process enabled characters with a prompt
            .map((char) => {
              return {
                prompt: String(char.prompt || "").trim(),
                uc: String(char.uc || "").trim(),
                center: char.center
                  ? {
                      x: Number(char.center.x) || 0.5,
                      y: Number(char.center.y) || 0.5,
                    }
                  : undefined,
              };
            });

          if (processedCharPrompts.length > 0) {
            params.characterPrompts = processedCharPrompts;
          }
        }

        // Add vibe transfer if available - handle the File object properly
        if (this.vibeTransferFile) {
          // Create a new File object to avoid proxy issues
          const fileBlob = await this.vibeTransferFile.arrayBuffer();
          const newFile = new File([fileBlob], this.vibeTransferFile.name, {
            type: this.vibeTransferFile.type,
          });
          params.vibeTransfer = newFile;
        }

        // Get custom host instance if needed
        const customHostObj = this.createCustomHostInstance();

        const response = await this.client.generateImage(params, customHostObj);

        if (response && response.length > 0) {
          // Save all generated images
          for (const generatedImage of response) {
            // Create a clean settings object without proxies
            const cleanSettings = JSON.parse(
              JSON.stringify({
                prompt: this.generationSettings.prompt,
                negativePrompt: this.generationSettings.negativePrompt,
                model: this.generationSettings.model,
                steps: this.generationSettings.steps,
                seed: seed,
                sampler: this.generationSettings.sampler,
                scale: this.generationSettings.scale,
              })
            );

            const imageData = {
              dataUrl: generatedImage.toDataURL(),
              timestamp: new Date().toISOString(),
              settings: cleanSettings,
              filename: `nyanovel_${Date.now()}.png`,
            };

            const id = await saveImageToDB(imageData);
            imageData.id = id;

            this.images.unshift(imageData);
          }

          // Select the first generated image
          this.selectImage(0);

          // Expand gallery to show new images
          this.galleryExpanded = true;
          setTimeout(() => {
            if (!this.galleryHovered) {
              this.galleryExpanded = false;
            }
          }, 3000);
        }
      } catch (error) {
        console.error("Error generating image:", error);
        alert(`Generation failed: ${error.message}`);
      } finally {
        this.isGenerating = false;
      }
    },

    // Apply director tool
    async applyDirectorTool(tool) {
      if (!this.selectedImage) return;

      this.isDirectorProcessing = true;
      this.processedImage = null;

      try {
        // Convert the data URL to a Blob
        const response = await fetch(this.selectedImage.dataUrl);
        const blob = await response.blob();

        // Get custom host instance if needed
        const customHostObj = this.createCustomHostInstance();

        // Apply the selected tool with custom host
        const result = await this.client[tool](blob, customHostObj);

        // Set the processed image
        this.processedImage = result.toDataURL();
      } catch (error) {
        console.error(`Error applying ${tool}:`, error);
        alert(`Failed to apply ${tool}: ${error.message}`);
      } finally {
        this.isDirectorProcessing = false;
      }
    },

    // Apply image variant generation
    async applyImageVariant() {
      if (!this.selectedImage) return;

      this.isDirectorProcessing = true;
      this.processedImage = null;

      try {
        // Convert the data URL to a Blob
        const response = await fetch(this.selectedImage.dataUrl);
        const blob = await response.blob();

        // Generate a variant of the image
        const result = await this.client.generateImage({
          image: blob,
          prompt: this.selectedImage.settings.prompt || "",
          negativePrompt: this.selectedImage.settings.negativePrompt || "",
          model: this.selectedImage.settings.model,
          steps: this.selectedImage.settings.steps,
          scale: this.selectedImage.settings.scale,
          sampler: this.selectedImage.settings.sampler,
          seed: Math.floor(Math.random() * 4294967295), // Use a new random seed
          action: "img2img", // Use img2img action for variants
          strength: 0.7, // Control how much the original image influences the result
        });

        if (result && result.length > 0) {
          // Set the processed image
          this.processedImage = result[0].toDataURL();
        }
      } catch (error) {
        console.error("Error generating image variant:", error);
        alert(`Failed to generate variant: ${error.message}`);
      } finally {
        this.isDirectorProcessing = false;
      }
    },

    // Apply emotion change
    async applyEmotionChange() {
      if (!this.selectedImage) return;

      this.isDirectorProcessing = true;
      this.processedImage = null;

      try {
        // Convert the data URL to a Blob
        const response = await fetch(this.selectedImage.dataUrl);
        const blob = await response.blob();

        // Get custom host instance if needed
        const customHostObj = this.createCustomHostInstance();

        // Apply emotion change
        const result = await this.client.changeEmotion(blob, customHostObj, this.emotionOptions.emotion, this.emotionOptions.prompt, Number(this.emotionOptions.emotionLevel));

        // Set the processed image
        this.processedImage = result.toDataURL();
      } catch (error) {
        console.error("Error changing emotion:", error);
        alert(`Failed to change emotion: ${error.message}`);
      } finally {
        this.isDirectorProcessing = false;
      }
    },

    // Apply colorize tool
    async applyColorizeTool() {
      if (!this.selectedImage) return;

      this.isDirectorProcessing = true;
      this.processedImage = null;

      try {
        const response = await fetch(this.selectedImage.dataUrl);
        const blob = await response.blob();

        // Get custom host instance if needed
        const customHostObj = this.createCustomHostInstance();

        const result = await this.client.colorize(blob, customHostObj, this.colorizeOptions.prompt, Number(this.colorizeOptions.defry));
        this.processedImage = result.toDataURL();
      } catch (error) {
        console.error("Error applying colorize:", error);
        alert(`Failed to apply colorize: ${error.message}`);
      } finally {
        this.isDirectorProcessing = false;
      }
    },

    // Save processed image
    async saveProcessedImage() {
      if (!this.processedImage) return;

      try {
        let processedWithTool = "directorTools"; // Default
        let toolOptions = {};

        if (this.showEmotionControls) {
          processedWithTool = "changeEmotion";
          toolOptions = {
            emotionOptions: JSON.parse(JSON.stringify(this.emotionOptions)),
          };
        } else if (this.showColorizeControls) {
          processedWithTool = "colorize";
          toolOptions = {
            colorizeOptions: JSON.parse(JSON.stringify(this.colorizeOptions)),
          };
        }

        const imageData = {
          dataUrl: this.processedImage,
          timestamp: new Date().toISOString(),
          settings: {
            ...this.selectedImage.settings,
            processedWith: processedWithTool,
            ...toolOptions,
          },
          filename: `nyanovel_processed_${Date.now()}.png`,
        };

        const id = await saveImageToDB(imageData);
        imageData.id = id;

        this.images.unshift(imageData);
        this.showDirectorTools = false;
        this.processedImage = null;
        this.selectImage(0);

        // Expand gallery to show new processed image
        this.galleryExpanded = true;
        setTimeout(() => {
          if (!this.galleryHovered) {
            this.galleryExpanded = false;
          }
        }, 3000);
      } catch (error) {
        console.error("Error saving processed image:", error);
        alert(`Failed to save processed image: ${error.message}`);
      }
    },

    // Select image
    selectImage(index) {
      if (index < 0 || index >= this.images.length) return;

      this.selectedImageIndex = index;
      this.selectedImage = this.images[index];
    },

    // Delete current image
    async deleteCurrentImage() {
      if (this.selectedImageIndex === null) return;

      try {
        const imageId = this.selectedImage.id;
        await deleteImageFromDB(imageId);

        this.images = this.images.filter((img) => img.id !== imageId);

        if (this.images.length > 0) {
          this.selectImage(0);
        } else {
          this.selectedImageIndex = null;
          this.selectedImage = null;
        }
      } catch (error) {
        console.error("Error deleting image:", error);
        alert(`Failed to delete image: ${error.message}`);
      }
    },

    // Clear all images
    async clearAllImages() {
      if (!confirm("Are you sure you want to delete all images? This action cannot be undone.")) {
        return;
      }

      try {
        await clearAllImagesFromDB();
        this.images = [];
        this.selectedImageIndex = null;
        this.selectedImage = null;
      } catch (error) {
        console.error("Error clearing images:", error);
        alert(`Failed to clear images: ${error.message}`);
      }
    },

    // Download current image
    downloadImage() {
      if (!this.selectedImage) return;

      const a = document.createElement("a");
      a.href = this.selectedImage.dataUrl;
      a.download = this.selectedImage.filename || "nyanovel-image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  };
}

// Make the function available globally
window.imageGenerator = imageGenerator;

// Add theme transition styles
document.addEventListener("DOMContentLoaded", () => {
  // Add transition styles to head
  const style = document.createElement("style");
  style.textContent = `
    .theme-transitioning * {
      transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease !important;
    }
  `;
  document.head.appendChild(style);

  console.log("DOM fully loaded - NyaNovel App ready to initialize");
});
