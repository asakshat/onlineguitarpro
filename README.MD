# ONLINE Guitar TAB PLAYER

A feature-rich, modern web application for viewing and playing Guitar Pro tabs using AlphaTab, with a searchable tab library.

![ Guitar Player](https://via.placeholder.com/800x450/f1f5f9/1e293b?text=AlphaTab+Guitar+Player)

## Features

- 🎵 **Guitar Tab Playback** - Play, pause, and navigate through guitar tabs
- 🔍 **Tab Searching** - Search for tabs by title, artist, or tags
- 📊 **Track Management** - Enable/disable individual tracks and control their volume
- ⏱️ **Playback Controls** - Adjust playback speed, master volume, and loop sections
- 🥁 **Metronome & Count-in** - Built-in metronome and count-in features
- 🔄 **Auto-scrolling** - Smart viewport following with the current playback position
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🖨️ **Print Support** - Print the currently displayed score
- 🎸 **Multi-instrument Support** - Support for various instrument types and tunings

## Technology Stack

- **Frontend**
  - HTML5, CSS3, JavaScript (ES6+)
  - [AlphaTab](https://www.alphatab.net/) - Guitar tab rendering and playback library

- **Backend**
  - Node.js
  - Express.js
  - File system-based tab storage and metadata management

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
   ```bash
   git clone git@github.com:asakshat/onlineguitarpro.git
   cd onlineguitarpro
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start the server
   ```bash
   node server.js
   ```

4. Open your browser and navigate to `http://localhost:3000`

### Tab Files

Place your Guitar Pro files (.gp, .gp3, .gp4, .gp5, .gpx, .gp7, .gtp) in the `tab-collection` directory. The server will automatically scan this directory and generate metadata for the tabs.

## Usage

### Main Player

The main player interface includes:

- **Track Sidebar**: Shows all tracks in the tab, allowing you to select tracks to display and adjust individual track volumes
- **Tab Display**: Displays the selected tab with auto-scrolling during playback
- **Control Bar**: Provides playback controls, including play/pause, stop, loop, metronome toggle, count-in toggle, zoom, and layout options

### Tab Search and Library

Access the tab library by:

1. When you first open the application, you'll see a search interface with popular tabs
2. Use the search box to find tabs by title, artist, or tags
3. Filter results by genre, difficulty, or sort criteria
4. Click on a tab card to load it into the player

### Playback Controls

- **Play/Pause**: Start or pause playback
- **Stop**: Stop playback and return to the beginning
- **Count-in**: Enable/disable count-in before playback starts
- **Metronome**: Enable/disable metronome during playback
- **Loop**: Enable/disable looping for the entire song
- **Speed**: Adjust playback speed (25%-200%)
- **Volume**: Adjust master volume and individual track volumes

## Configuration

The player settings can be adjusted in `script.js`. Key settings include:

- **SoundFont**: Change the SoundFont used for playback
- **Layout Mode**: Choose between 'page' and 'horizontal' layout
- **Scrolling Behavior**: Adjust scroll speed, animation duration, and offsets
- **Zoom Level**: Default scale for the tab display

## API Endpoints

The following API endpoints are available:

- `GET /api/tabs/search?query=<search-term>` - Search tabs by title, artist, or tags
- `GET /api/tabs` - Get all tabs with optional filtering
- `GET /api/tabs/popular` - Get the most popular tabs
- `GET /api/tabs/:id` - Get a specific tab by ID
- `GET /api/test` - Test endpoint to verify server status

Admin endpoints (require API key):
- `POST /api/admin/generate-metadata` - Regenerate metadata by scanning the tab directory
- `GET /api/admin/refresh-metadata` - Refresh metadata from the file

## Customization

### Styling

The application uses CSS variables for easy theming. Edit the variables in `style.css` to customize the appearance:

```css
:root {
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --secondary-color: #f8fafc;
  --text-color: #334155;
  --light-text: #94a3b8;
  --dark-bg: #1e293b;
  --border-color: #e2e8f0;
  --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --border-radius: 8px;
}
```

### Adding More Tabs

To add more tabs to the library:

1. Place Guitar Pro files in the `tab-collection` directory
2. Access the `/api/admin/refresh-metadata` endpoint to update the tab metadata
3. Alternatively, restart the server to automatically regenerate metadata

## Project Structure

```
alphatab-guitar-player/
├── public/                # Static assets
│   ├── index.html         # Main HTML file
│   ├── style.css          # CSS styles
│   ├── script.js          # Main player functionality
│   └── search.js          # Tab search functionality
├── tab-collection/        # Guitar Pro tab files
├── data/                  # Generated metadata
└── server.js              # Express server

```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [AlphaTab](https://www.alphatab.net/) - The amazing library that makes this project possible
- The Guitar Pro community - For creating and sharing tabs