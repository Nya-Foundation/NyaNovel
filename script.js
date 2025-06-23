// Setup Alpine.js store for app state
document.addEventListener("alpine:init", () => {
  Alpine.store("app", {
    disclaimerAccepted: localStorage.getItem("disclaimerAccepted") === "true",
  });
});

// We'll load NekoAI library dynamically once the DOM is ready
let NovelAI, Model, Resolution, Sampler, Noise, Action, EventType;

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
      const images = request.result;
      images.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Sort by timestamp
      resolve(images);
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
      batchId: image.batchId || null,
      batchIndex: image.batchIndex || 0,
      batchSize: image.batchSize || 1,
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
  return import("https://cdn.jsdelivr.net/npm/nekoai-js@1.2.4/dist/index.min.mjs")
    .then((module) => {
      // Expose to window and local scope
      window.NovelAI = module.NovelAI;
      window.Model = module.Model;
      window.Resolution = module.Resolution;
      window.Sampler = module.Sampler;
      window.Noise = module.Noise;
      window.Action = module.Action;
      window.parseImage = module.parseImage;
      window.EventType = module.EventType;

      // Optionally assign to local scope if needed
      NovelAI = module.NovelAI;
      Model = module.Model;
      Resolution = module.Resolution;
      Sampler = module.Sampler;
      Noise = module.Noise;
      Action = module.Action;
      EventType = module.EventType;
      return module;
    })
    .catch((error) => {
      console.error("Error importing NekoAI library:", error);
      throw error;
    });
}

// Define the Alpine.js data function
function imageGenerator() {
  return {
    // Core State
    token: localStorage.getItem("nai-token") || "",
    serverUrl: localStorage.getItem("nai-server") || "https://image.novelai.net",
    darkMode: localStorage.getItem("darkMode") === "true" || (localStorage.getItem("darkMode") === null && window.matchMedia("(prefers-color-scheme: dark)").matches),
    client: null,

    // UI State
    showServerModal: false,
    showDirectorTools: false,
    showEmotionControls: false,
    showColorizeControls: false,
    settingsCollapsed: false,
    galleryExpanded: false,
    activeSettingsTab: "basic",
    showFocusedView: false,
    focusedImageIndex: null,

    // Generation State
    isGenerating: false,
    isDirectorProcessing: false,
    images: [],
    selectedImage: null,
    selectedBatch: null,
    processedImage: null,

    // Configuration
    retryConfig: {
      maxRetries: 3,
      baseDelay: 2000,
      maxDelay: 60000,
    },

    // Director Tools Options
    emotionOptions: {
      emotion: "neutral",
      prompt: "",
      emotionLevel: 0,
    },

    colorizeOptions: {
      prompt: "",
      defry: 0,
    },

    // Generation settings
    generationSettings: {
      prompt: "",
      negative_prompt: "",
      model: "nai-diffusion-4-5-full",
      resPreset: "normal_portrait",
      width: 832,
      height: 1216,
      steps: 28,
      seed: -1,
      sampler: "k_euler_ancestral",
      scale: 5.5,
      action: "generate",
      ucPreset: 0,
      qualityToggle: true,
      n_samples: 1,
      dynamic_thresholding: false,
      cfg_rescale: 0,
      noise_schedule: "karras",
      autoSmea: false,
      characterPrompts: [],
      reference_image_multiple: undefined,
      reference_strength_multiple: undefined,
      reference_information_extracted_multiple: undefined,
    },

    // Helper Methods
    autoResizeTextarea(textarea) {
      if (!textarea) return;
      textarea.style.height = "auto";
      const maxHeight = 250;
      const minHeight = 100;
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = Math.max(minHeight, Math.min(scrollHeight, maxHeight)) + "px";
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    },

    applyTheme() {
      const htmlEl = document.documentElement;
      htmlEl.classList.toggle("dark", this.darkMode);
      htmlEl.classList.toggle("light", !this.darkMode);
    },

    setupGalleryHover() {
      let hoverTimeout;
      document.addEventListener("mousemove", (e) => {
        const galleryPanel = document.querySelector(".gallery-panel");
        if (!galleryPanel) return;

        const rect = galleryPanel.getBoundingClientRect();
        const isHovering = e.clientX >= rect.left - 20 && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

        if (isHovering) {
          this.galleryExpanded = true;
          clearTimeout(hoverTimeout);
        } else if (this.galleryExpanded) {
          hoverTimeout = setTimeout(() => {
            this.galleryExpanded = false;
          }, 300);
        }
      });
    },

    // Initialization
    async init() {
      console.log("Initializing NyaNovel image generator...");

      // Apply theme immediately
      this.applyTheme();

      // Setup gallery hover behavior
      this.setupGalleryHover();

      // Auto-resize textareas on load
      setTimeout(() => {
        document.querySelectorAll("textarea").forEach((textarea) => this.autoResizeTextarea(textarea));
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
          this.showServerModal = true;
        }

        // Load and display existing images
        this.images = await loadImagesFromDB();
        this.images.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (this.images.length > 0) {
          this.selectBatch(0);
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
        host: this.serverUrl,
        retry: {
          enabled: true,
          maxRetries: parseInt(this.retryConfig.maxRetries) || 3,
          baseDelay: parseInt(this.retryConfig.baseDelay) || 2000,
          maxDelay: 60000,
          retryStatusCodes: [429],
        },
      });
    },

    // Configuration methods
    saveServerConfig() {
      localStorage.setItem("nai-token", this.token);
      localStorage.setItem("nai-server", this.serverUrl);
      localStorage.setItem("nai-retryMaxRetries", this.retryConfig.maxRetries.toString());
      localStorage.setItem("nai-retryBaseDelay", this.retryConfig.baseDelay.toString());
      this.initClient();
      this.showServerModal = false;
    },

    toggleDarkMode() {
      this.darkMode = !this.darkMode;
      localStorage.setItem("darkMode", this.darkMode.toString());
      this.applyTheme();
    },

    // Character management
    addCharacter() {
      this.generationSettings.characterPrompts.push({
        prompt: "",
        uc: "",
        center: { x: 0.5, y: 0.5 },
        enabled: true,
      });
    },

    removeCharacter(index) {
      this.generationSettings.characterPrompts.splice(index, 1);
    },

    // Handle vibe transfer image upload
    handleVibeTransferUpload(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      // Initialize arrays if they don't exist yet
      if (!this.generationSettings.reference_image_multiple) {
        this.generationSettings.reference_image_multiple = [];
        this.generationSettings.reference_strength_multiple = [];
        this.generationSettings.reference_information_extracted_multiple = [];
      }

      // Process each selected file
      Array.from(files).forEach(async (file) => {
        try {
          const parsedImage = await window.parseImage(file);
          this.generationSettings.reference_image_multiple.push(parsedImage.base64);
          this.generationSettings.reference_strength_multiple.push(0.6);
          this.generationSettings.reference_information_extracted_multiple.push(1.0);
        } catch (error) {
          console.error("Error processing reference image:", error);
          alert("Failed to process reference image. Please try another image.");
        }
      });

      event.target.value = "";
    },

    // Remove a reference image at the specified index
    removeReferenceImage(index) {
      this.generationSettings.reference_image_multiple.splice(index, 1);
      this.generationSettings.reference_strength_multiple.splice(index, 1);
      this.generationSettings.reference_information_extracted_multiple.splice(index, 1);
    },

    // Clear all vibe transfer images
    clearAllReferenceImages() {
      this.generationSettings.reference_image_multiple = undefined;
      this.generationSettings.reference_strength_multiple = undefined;
      this.generationSettings.reference_information_extracted_multiple = undefined;
      document.getElementById("vibe-transfer-file").value = "";
    },

    // Generate images with streaming support
    async generateImage() {
      if (!this.client) {
        this.showServerModal = true;
        return;
      }

      this.isGenerating = true;
      this.selectedBatch = null;
      this.selectedImage = null;

      try {
        const settings = JSON.parse(JSON.stringify(this.generationSettings));

        // Update seed if random
        if (settings.seed === -1) {
          settings.seed = Math.floor(Math.random() * 4294967295);
        }

        // Process character prompts
        if (settings.characterPrompts?.length > 0) {
          settings.characterPrompts = settings.characterPrompts
            .filter((char) => char.enabled && String(char.prompt || "").trim())
            .map((char) => ({
              prompt: String(char.prompt || "").trim(),
              uc: String(char.uc || "").trim(),
              center: char.center || { x: 0.5, y: 0.5 },
            }));
        }

        const response = await this.client.generateImage(settings, true);

        // Handle streaming response
        if (response && typeof response[Symbol.asyncIterator] === "function") {
          await this.handleStreamingResponse(response, settings);
        } else if (Array.isArray(response)) {
          if (response.length > 0) {
            const batchId = Date.now();
            const finalImages = response.map((image, index) => ({
              image: image,
              sampleIndex: index,
            }));

            await this.saveFinalImages(finalImages, batchId, settings);
          }
        } else {
          throw new Error("Unexpected response format from image generation");
        }
      } catch (error) {
        console.error("Error generating image:", error);
        alert(`Generation failed: ${error.message}`);
      } finally {
        this.isGenerating = false;
      }
    },

    // Handle streaming response
    async handleStreamingResponse(response, settings) {
      console.log("Handling streaming response...");

      const tempBatch = [];
      const batchId = Date.now();
      let finalImages = [];

      // Initialize temp batch structure
      for (let i = 0; i < settings.n_samples; i++) {
        tempBatch.push({
          dataUrl: null,
          isIntermediate: true,
          sampleIndex: i,
          stepIndex: 0,
          batchId: batchId,
          status: "initializing",
          progress: 0,
        });
      }

      this.selectedBatch = tempBatch;

      // Process streaming events
      for await (const event of response) {
        if (event.event_type === window.EventType.INTERMEDIATE) {
          const sampleIndex = event.samp_ix;
          if (sampleIndex < tempBatch.length) {
            tempBatch[sampleIndex] = {
              ...tempBatch[sampleIndex],
              dataUrl: event.image.toDataURL(),
              stepIndex: event.step_ix,
              isIntermediate: true,
              status: "generating",
              progress: Math.round((event.step_ix / settings.steps) * 100),
            };
            this.selectedBatch = [...tempBatch];
          }
        } else if (event.event_type === window.EventType.FINAL) {
          finalImages.push({
            image: event.image,
            sampleIndex: event.samp_ix,
          });
        }
      }

      // Process final images
      if (finalImages.length > 0) {
        await this.saveFinalImages(finalImages, batchId, settings);
      }
    },

    // Save final images to database
    async saveFinalImages(finalImages, batchId, settings) {
      finalImages.sort((a, b) => a.sampleIndex - b.sampleIndex);

      for (let i = 0; i < finalImages.length; i++) {
        const finalImageData = finalImages[i];
        const imageData = {
          dataUrl: finalImageData.image.toDataURL(),
          timestamp: new Date().toISOString(),
          settings: settings,
          filename: `nyanovel_${batchId}_${i + 1}.png`,
          batchId: batchId,
          batchIndex: i,
          batchSize: finalImages.length,
        };

        const id = await saveImageToDB(imageData);
        imageData.id = id;
        this.images.unshift(imageData);
      }

      this.selectBatch(0);
      this.expandGalleryTemporarily();
    },

    // Expand gallery temporarily
    expandGalleryTemporarily() {
      this.galleryExpanded = true;
      setTimeout(() => {
        this.galleryExpanded = false;
      }, 3000);
    },

    // Apply director tool
    async applyDirectorTool(tool) {
      if (!this.selectedImage) return;

      this.isDirectorProcessing = true;
      this.processedImage = null;

      try {
        const response = await fetch(this.selectedImage.dataUrl);
        const blob = await response.blob();
        const result = await this.client[tool](blob);
        this.processedImage = result.toDataURL();
      } catch (error) {
        console.error(`Error applying ${tool}:`, error);
        alert(`Failed to apply ${tool}: ${error.message}`);
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
        const response = await fetch(this.selectedImage.dataUrl);
        const blob = await response.blob();
        const result = await this.client.changeEmotion(blob, this.emotionOptions.emotion, this.emotionOptions.prompt, Number(this.emotionOptions.emotionLevel));
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
        const result = await this.client.colorize(blob, this.colorizeOptions.prompt, Number(this.colorizeOptions.defry));
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
        let processedWithTool = "directorTools";
        let toolOptions = {};

        if (this.showEmotionControls) {
          processedWithTool = "changeEmotion";
          toolOptions = { emotionOptions: JSON.parse(JSON.stringify(this.emotionOptions)) };
        } else if (this.showColorizeControls) {
          processedWithTool = "colorize";
          toolOptions = { colorizeOptions: JSON.parse(JSON.stringify(this.colorizeOptions)) };
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
        this.selectBatch(0);
        this.expandGalleryTemporarily();
      } catch (error) {
        console.error("Error saving processed image:", error);
        alert(`Failed to save processed image: ${error.message}`);
      }
    },

    // Select batch by index of first image in batch
    selectBatch(index) {
      if (index < 0 || index >= this.images.length) return;

      const firstImage = this.images[index];
      if (firstImage.batchId) {
        this.selectedBatch = this.images.filter((img) => img.batchId === firstImage.batchId);
        this.selectedImage = firstImage;
      } else {
        this.selectedBatch = [firstImage];
        this.selectedImage = firstImage;
      }
    },

    // Get grouped images for gallery display
    getGroupedGalleryImages() {
      const grouped = [];
      const seenBatchIds = new Set();

      for (const image of this.images) {
        if (image.batchId && seenBatchIds.has(image.batchId)) {
          continue;
        }

        if (image.batchId) {
          seenBatchIds.add(image.batchId);
          const batchImages = this.images.filter((img) => img.batchId === image.batchId);
          grouped.push({
            ...image,
            batchSize: batchImages.length,
            isFirstOfBatch: true,
          });
        } else {
          grouped.push({
            ...image,
            batchSize: 1,
            isFirstOfBatch: false,
          });
        }
      }

      return grouped;
    },

    // Focus on specific image in batch
    focusImage(index) {
      this.focusedImageIndex = index;
      this.showFocusedView = true;
    },

    // Close focused view
    closeFocusedView() {
      this.showFocusedView = false;
      this.focusedImageIndex = null;
    },

    // Download specific image from batch
    downloadImageFromBatch(image) {
      const a = document.createElement("a");
      a.href = image.dataUrl;
      a.download = image.filename || "nyanovel-image.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    // Copy image to clipboard
    async copyImageToClipboard(image) {
      try {
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        // Show temporary feedback
        this.showTooltipFeedback("Image copied to clipboard!");
      } catch (error) {
        console.error("Failed to copy image:", error);
        // Fallback: try to copy the data URL as text
        try {
          await navigator.clipboard.writeText(image.dataUrl);
          this.showTooltipFeedback("Image data copied to clipboard!");
        } catch (fallbackError) {
          console.error("Failed to copy image data:", fallbackError);
          alert("Failed to copy image to clipboard");
        }
      }
    },

    // Copy seed from image to generation settings
    copySeedFromImage(image) {
      if (image.settings && image.settings.seed !== undefined) {
        this.generationSettings.seed = image.settings.seed;
        this.showTooltipFeedback(`Seed ${image.settings.seed} copied to settings!`);
      } else {
        this.generationSettings.seed = -1;
      }
    },

    // Show temporary tooltip feedback
    showTooltipFeedback(message) {
      // Create or update feedback element
      let feedback = document.getElementById("tooltip-feedback");
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.id = "tooltip-feedback";
        feedback.className = "fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium text-sm z-50 transition-all duration-300";
        document.body.appendChild(feedback);
      }

      feedback.textContent = message;
      feedback.style.opacity = "1";
      feedback.style.transform = "translate(-50%, 0)";

      // Hide after 2 seconds
      setTimeout(() => {
        feedback.style.opacity = "0";
        feedback.style.transform = "translate(-50%, -10px)";
      }, 2000);
    },

    // Delete specific image from batch
    async deleteImageFromBatch(image) {
      try {
        await deleteImageFromDB(image.id);

        // Remove from images array
        this.images = this.images.filter((img) => img.id !== image.id);

        // Update selectedBatch
        if (this.selectedBatch) {
          this.selectedBatch = this.selectedBatch.filter((img) => img.id !== image.id);

          // If no images left in batch, select another image or clear selection
          if (this.selectedBatch.length === 0) {
            if (this.images.length > 0) {
              this.selectBatch(0);
            } else {
              this.selectedImage = null;
              this.selectedBatch = null;
            }
          } else {
            // Update selected image to first remaining in batch
            this.selectedImage = this.selectedBatch[0];
          }
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
        this.selectedImage = null;
        this.selectedBatch = null;
      } catch (error) {
        console.error("Error clearing images:", error);
        alert(`Failed to clear images: ${error.message}`);
      }
    },
  };
}

// Make the function available globally
window.imageGenerator = imageGenerator;

// Add styles once when DOM loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM fully loaded - NyaNovel App ready to initialize");
});
