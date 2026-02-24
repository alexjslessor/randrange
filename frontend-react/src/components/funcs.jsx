import { ObjectId } from 'bson';
import axios from 'axios';
// Check for browser environment

// const sanitizeFilename = (filename) => {
//   return filename.normalize("NFKD").replace(/[^\x00-\x7F]/g, ""); // Remove non-ASCII characters
// };

export function mergeAlbumsAndVideos(albums, videos) {
  albums = albums || [];
  videos = videos || [];
  // Create a map of album_id to album_name for quick lookup
  const albumMap = albums.reduce((map, album) => {
    map[album.id || album._id] = album.album_name; // Use album.id or album._id as the key
    // map[album.id] = album.album_name; // Use album.id as the key
    return map;
  }, {});
  // Merge the video objects with the album_name from the album map
  return videos.map((video) => ({
    ...video, // Keep all keys from the video schema
    album_name: albumMap[video.album_id] || null, // Add album_name or null if not found
  }));
}
export function getSummaryStats(videos) {
  return videos.reduce(
    (totals, video) => {
      // Sum file sizes
      const fileSize = typeof video.file_size === 'string' ? parseFloat(video.file_size) : video.file_size;
      totals.totalFileSize += fileSize;
      // Sum views
      const views = typeof video.views === 'number' ? video.views : 0;
      totals.totalViews += views;
      return totals;
    },
    { totalFileSize: 0, totalViews: 0 } // Initial values
  );
}
// function sumFileSizes(videos) {
//   return videos.reduce((total, video) => {
//     // Convert file_size to a number if it's a string, and default to 0 if null or undefined
//     const fileSize = typeof video.file_size === 'string' ? parseFloat(video.file_size) : video.file_size || 0;
//     return total + fileSize;
//   }, 0);
// }
// function sumViews(videos) {
//   return videos.reduce((total, video) => {
//     // Ensure views is a number and default to 0 if undefined or null
//     const views = typeof video.views === 'number' ? video.views : 0;
//     return total + views;
//   }, 0);
// }
export function getDataTime(objectId) {
  // 2025-03-08 04:04:37
  if (!ObjectId.isValid(objectId)) {
    return 'error';
  }
  const timestamp = new ObjectId(objectId).getTimestamp();
  return timestamp.toISOString().replace('T', ' ').slice(0, 19);
}

export function humanFileSize(file_size) {
  // calculate file size in MB
  // 1 MB = 1024 * 1024 bytes
  return (file_size / (1024 * 1024)).toFixed(2);
}

export function clearInput() {
  const fileInput = document.getElementById('fileInput');
  console.log('fileinput: ', fileInput)
  if (fileInput) {
    fileInput.value = '';
    // fileInput.files = null;
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
    console.log("Fallback: Copying text command was successful");
    return true;
  } catch (err) {
    console.error("Fallback: Unable to copy", err);
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
}

export const onDownloadClick = async (video) => {
  try {
    const response = await axios.get(
      `/api/download?file_id=${video?.metadata?._id}`,
      {
        responseType: 'blob', // Treat the response as a binary file
      }
    );
    // const filename = response.headers["content-disposition"].split("filename=")[1] || 'video.mp4';
    const content_type = response.headers['content-type'] || 'video/mp4';
    // const content_type = 'application/octet-stream'
    // Create a Blob from the response data
    const blob = new Blob(
      [response.data], 
      {
        type: content_type,
      }
    );
    // Create a download link and trigger the download
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);

    // link.download = filename
    const [name, ext] = video?.metadata?.name.split('.');
    const f_name = `${name}-download.${ext}`;
    console.log('f_name: ', f_name);
    link.download = f_name;

    // link.download = video?.metadata?.name;
    link.click();
    // document.body.removeChild(link);
    // window.URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('Error downloading the video:', error);
  }
};

//   function downloadFile(response) {
//     const filename = response.headers["content-disposition"].split("filename=")[1];
//     const content_type = response.headers['content-type']
//     const fileBlob = new Blob([response.data], { type: content_type } )
//     let fileLink = document.createElement('a');
//     fileLink.href = window.URL.createObjectURL(fileBlob)
//     fileLink.download = filename
//     document.body.appendChild(fileLink);
//     fileLink.click();
//     // tare down actions
//     document.body.removeChild(fileLink);
//     window.URL.revokeObjectURL(fileLink.href)
// }

// const onDownloadClick = async () => {
//   try {
//     const response = await axios.get(
//       `/api/download?file_id=${video?.metadata?._id}`,
//       {
//         responseType: 'blob', // Ensure the response is treated as a binary file
//       }
//     );
//     // Create a Blob object from the response
//     const blob = new Blob([response.data], { type: 'video/mp4' });
//     // Create a download link and trigger the download
//     const link = document.createElement('a');
//     link.href = window.URL.createObjectURL(blob);
//     link.download = video?.metadata?.name || 'video.mp4';
//     link.click();

//     console.info('Download started...');
//   } catch (error) {
//     console.error('Error downloading the video:', error);
//   }
// };