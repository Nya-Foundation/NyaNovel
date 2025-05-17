# NyaNovel

A front-end only client for NovelAI's image generation service, built with HTML, TailwindCSS, and Alpine.js.

## 🌟 Features

- **💫 Clean UI**: Modern, responsive interface with dark/light mode support
- **🖼️ Image Generation**: Create anime-style images using NovelAI's API
- **🎨 Director Tools**: Edit generated images with line art, sketch, background removal and more
- **🔄 Batch Generation**: Generate multiple images at once

## 🚀 Getting Started

### Prerequisites

- NovelAI account with API access
- Web browser (Chrome, Firefox, Safari, Edge recommended)

### Installation Options

#### Option 1: Docker (Recommended)

```bash
docker compose up
```
or

```bash
docker run -d -p 8080:80 k3scat/nya-novel
```
Then open your browser and navigate to `http://localhost:8080`

#### Option 2: Direct Usage

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

After building, you can serve the `dist` directory with any static file server.

## ⚙️ Configuration

1. Click the settings icon in the top right corner
2. Enter your NovelAI API endpoint (default: https://image.novelai.net)
3. Enter your NovelAI API token
4. Click "Connect to NovelAI"

## 🔒 Privacy

NyaNovel runs entirely in your browser. Your API key is stored only in your local browser storage and is never sent to any server other than the NovelAI API.

## 🧰 Development

```bash
# Install dependencies
npm install

# Then use Live Server (vscode plugin) on the dist/ folder
```

## 📝 Legal Disclaimer

NyaNovel is provided strictly for research purposes only. Any commercial use and abuse are not permitted and may violate NovelAI's Terms of Service. Users are solely responsible for ensuring their usage complies with all applicable laws and NovelAI's terms. The creators of NyaNovel disclaim all liability for any misuse or violations committed by users.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [NovelAI](https://novelai.net) for their amazing image generation API
- [TailwindCSS](https://tailwindcss.com) for the styling framework
- [Alpine.js](https://alpinejs.dev) for the JavaScript framework
- [Nya Foundation](https://github.com/Nya-Foundation) for the support

---

<p align="center">
  Made with ♥ by the Nya Foundation
</p>