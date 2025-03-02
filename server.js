const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/tabs', express.static(path.join(__dirname, 'tab-collection')));

console.log('Tab collection directory path:', path.join(__dirname, 'tab-collection'));

let tabsMetadata = [];

async function loadTabMetadata() {
  try {
    const metadataPath = path.join(__dirname, 'data', 'tabs-metadata.json');
    
    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      tabsMetadata = JSON.parse(data);
      console.log(`Loaded metadata for ${tabsMetadata.length} tabs`);
      
      if (!tabsMetadata || tabsMetadata.length === 0) {
        console.log('Metadata file exists but is empty, generating metadata...');
        await generateTabMetadata();
      }
    } catch (error) {
      console.log('Metadata file not found or invalid, generating metadata...');
      await generateTabMetadata();
    }
  } catch (error) {
    console.error('Error in loadTabMetadata:', error);
    tabsMetadata = [];
  }
}

async function generateTabMetadata() {
  try {
    const tabsDir = path.join(__dirname, 'tab-collection');
    console.log('Scanning directory:', tabsDir);
    
    try {
      await fs.access(tabsDir);
    } catch (err) {
      console.error('tab-collection directory does not exist, creating it...');
      await fs.mkdir(tabsDir, { recursive: true });
      tabsMetadata = [];
      return;
    }
    
    const files = await fs.readdir(tabsDir);
    console.log(`Found ${files.length} total files in directory`);
    
    const metadata = [];
    const gpFileFormats = ['.gp', '.gp3', '.gp4', '.gp5', '.gpx', '.gp7', '.gtp'];
    
    for (const file of files) {
      const fileExt = path.extname(file).toLowerCase();
      
      if (!gpFileFormats.includes(fileExt)) {
        continue;
      }
      
      console.log(`Processing tab file: ${file}`);
      
      const nameWithoutExt = path.basename(file, fileExt);
      let artist = 'Unknown';
      let title = nameWithoutExt;
      
    
      let parts = [];
      if (nameWithoutExt.includes(' - ')) {
        parts = nameWithoutExt.split(' - ');
      } else if (nameWithoutExt.includes('-')) {
        parts = nameWithoutExt.split('-');
      } else if (nameWithoutExt.includes('_')) {
        parts = nameWithoutExt.split('_');
      }
      
      if (parts.length >= 2) {
        artist = parts[0].trim().replace(/_/g, ' ');
        title = parts.slice(1).join(' ').trim().replace(/_/g, ' ');
      }
      
      const searchableText = `${artist} ${title}`.toLowerCase();
      
      const id = Buffer.from(`${artist}-${title}`).toString('base64');
      
      try {
        await fs.access(path.join(tabsDir, file));
        
        metadata.push({
          id,
          title,
          artist,
          fileUrl: `/tabs/${encodeURIComponent(file)}`,
          fileFormat: fileExt.replace('.', ''),
          album: '',
          genre: guessGenreFromFile(file),
          difficulty: guessDifficultyFromFile(file),
          tags: generateTagsFromFile(file, searchableText),
          searchableText, 
          originalFileName: file,
          uploadDate: new Date().toISOString(),
          views: Math.floor(Math.random() * 1000)
        });
        
        console.log(`Added metadata for: ${artist} - ${title}`);
      } catch (err) {
        console.error(`File not accessible: ${file}`, err);
      }
    }
    
    console.log(`Processed ${metadata.length} guitar tab files`);
    
    const dataDir = path.join(__dirname, 'data');
    try {
      await fs.mkdir(dataDir, { recursive: true });
      console.log('Created data directory');
    } catch (err) {
      console.log('Data directory already exists');
    }
    
    const metadataPath = path.join(dataDir, 'tabs-metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Saved metadata to ${metadataPath}`);
    
    tabsMetadata = metadata;
    
    if (metadata.length > 0) {
      console.log('Sample metadata entry:', metadata[0]);
    }
  } catch (error) {
    console.error('Error generating metadata:', error);
    tabsMetadata = [];
  }
}

function guessGenreFromFile(filename) {
  filename = filename.toLowerCase();
  
  if (filename.includes('metal') || filename.includes('rock')) {
    return 'Rock/Metal';
  } else if (filename.includes('jazz')) {
    return 'Jazz';
  } else if (filename.includes('blues')) {
    return 'Blues';
  } else if (filename.includes('pop')) {
    return 'Pop';
  } else if (filename.includes('classical')) {
    return 'Classical';
  } else {
    return 'Other';
  }
}

function guessDifficultyFromFile(filename) {
  filename = filename.toLowerCase();
  
  if (filename.includes('easy') || filename.includes('beginner')) {
    return 'Beginner';
  } else if (filename.includes('advanced') || filename.includes('hard')) {
    return 'Advanced';
  } else if (filename.includes('expert')) {
    return 'Expert';
  } else {
    return 'Intermediate'; 
  }
}

function generateTagsFromFile(filename, searchableText) {
  const tags = [];
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('bass')) {
    tags.push('bass');
  } else if (lowerFilename.includes('drum')) {
    tags.push('drums');
  } else {
    tags.push('guitar');
  }
  
  if (lowerFilename.includes('solo')) tags.push('solo');
  if (lowerFilename.includes('tab')) tags.push('tab');
  if (lowerFilename.includes('chords') || lowerFilename.includes('chord')) tags.push('chords');
  if (lowerFilename.includes('acoustic')) tags.push('acoustic');
  if (lowerFilename.includes('electric')) tags.push('electric');
  
  const words = searchableText.split(/\s+/).filter(word => word.length > 3);
  for (const word of words) {
    if (!tags.includes(word) && tags.length < 10) {
      tags.push(word);
    }
  }
  
  return tags;
}

app.get('/api/test', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    metadataCount: tabsMetadata.length,
    sampleMetadata: tabsMetadata.slice(0, 2)
  });
});

app.get('/api/tabs/popular', (req, res) => {
  try {
    console.log('Popular tabs request received');
    console.log('Current tabs metadata count:', tabsMetadata.length);
    
    if (!tabsMetadata || tabsMetadata.length === 0) {
      console.log('No metadata available, sending empty array');
      return res.status(200).json([]);
    }
    
    const popularTabs = [...tabsMetadata]
      .sort((a, b) => (b.views || 0) - (a.views || 0))
      .slice(0, 10);
    
    console.log('Sending popular tabs:', popularTabs.length);
    res.status(200).json(popularTabs);
  } catch (error) {
    console.error('Get popular tabs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/tabs/search', (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const normalizedQuery = query.toLowerCase().trim();
    
    const searchTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 0);
    
    const searchResults = tabsMetadata.filter(tab => {
      const normalizedTitle = (tab.title || '').toLowerCase();
      const normalizedArtist = (tab.artist || '').toLowerCase();
      const normalizedFileName = `${normalizedArtist}-${normalizedTitle}`;
      
      const rawFileName = tab.fileUrl ? tab.fileUrl.split('/').pop().toLowerCase() : '';
      
      const matchesAllTerms = searchTerms.every(term => {
        return normalizedTitle.includes(term) || 
               normalizedArtist.includes(term) || 
               normalizedFileName.includes(term) ||
               rawFileName.includes(term);
      });
      
      const exactMatch = normalizedTitle === normalizedQuery || 
                         normalizedArtist === normalizedQuery;
      
      const tagsMatch = tab.tags && tab.tags.some(tag => 
        searchTerms.some(term => tag.toLowerCase().includes(term))
      );
      
      return matchesAllTerms || exactMatch || tagsMatch;
    });
    
    console.log(`Search for "${query}" returned ${searchResults.length} results`);
    
    const sortedResults = searchResults.sort((a, b) => {
      const aTitle = (a.title || '').toLowerCase();
      const bTitle = (b.title || '').toLowerCase();
      const aArtist = (a.artist || '').toLowerCase();
      const bArtist = (b.artist || '').toLowerCase();
      
      const aExactMatch = aTitle === normalizedQuery || aArtist === normalizedQuery;
      const bExactMatch = bTitle === normalizedQuery || bArtist === normalizedQuery;
      
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      const aStartsWith = aTitle.startsWith(normalizedQuery) || aArtist.startsWith(normalizedQuery);
      const bStartsWith = bTitle.startsWith(normalizedQuery) || bArtist.startsWith(normalizedQuery);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      return (b.views || 0) - (a.views || 0);
    });
    
    res.status(200).json(sortedResults.slice(0, 20)); 
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search', error: error.message });
  }
});

app.get('/api/tabs/:id', (req, res) => {
  try {
    const tab = tabsMetadata.find(t => t.id === req.params.id);
    
    if (!tab) {
      return res.status(404).json({ message: 'Tab not found' });
    }
    
    tab.views = (tab.views || 0) + 1;
    
    res.status(200).json(tab);
  } catch (error) {
    console.error('Get tab error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/tabs', (req, res) => {
  try {
    const { artist, genre, difficulty, format, sort, limit = 20, page = 1 } = req.query;
    
    let filteredTabs = [...tabsMetadata];
    
    if (artist) {
      filteredTabs = filteredTabs.filter(tab => 
        tab.artist.toLowerCase().includes(artist.toLowerCase())
      );
    }
    
    if (genre) {
      filteredTabs = filteredTabs.filter(tab => 
        tab.genre && tab.genre.toLowerCase().includes(genre.toLowerCase())
      );
    }
    
    if (difficulty) {
      filteredTabs = filteredTabs.filter(tab => 
        tab.difficulty === difficulty
      );
    }
    
    if (format) {
      filteredTabs = filteredTabs.filter(tab => 
        tab.fileFormat === format
      );
    }
    
    if (sort) {
      switch (sort) {
        case 'newest':
          filteredTabs.sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));
          break;
        case 'oldest':
          filteredTabs.sort((a, b) => new Date(a.uploadDate || 0) - new Date(b.uploadDate || 0));
          break;
        case 'popular':
          filteredTabs.sort((a, b) => (b.views || 0) - (a.views || 0));
          break;
        case 'az':
          filteredTabs.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'za':
          filteredTabs.sort((a, b) => b.title.localeCompare(a.title));
          break;
        default:
          filteredTabs.sort((a, b) => (b.views || 0) - (a.views || 0));
      }
    } else {
      filteredTabs.sort((a, b) => (b.views || 0) - (a.views || 0));
    }
    
    const startIndex = (page - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTabs = filteredTabs.slice(startIndex, endIndex);
    
    res.status(200).json({
      tabs: paginatedTabs,
      pagination: {
        total: filteredTabs.length,
        page: parseInt(page),
        pages: Math.ceil(filteredTabs.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get tabs error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/admin/generate-metadata', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    await generateTabMetadata();
    
    res.status(200).json({ 
      message: `Generated metadata for ${tabsMetadata.length} tabs`,
      count: tabsMetadata.length,
      sampleEntries: tabsMetadata.slice(0, 3)
    });
  } catch (error) {
    console.error('Generate metadata error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/admin/refresh-metadata', async (req, res) => {
  try {
    await generateTabMetadata();
    res.json({ 
      success: true, 
      message: 'Metadata refreshed successfully', 
      count: tabsMetadata.length 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
  await loadTabMetadata();
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Tab metadata loaded with ${tabsMetadata.length} entries`);
  });
}

startServer();

module.exports = app;