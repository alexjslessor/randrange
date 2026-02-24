import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListSubheader,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  AddCircle as AddCircleIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import ProgressCircle from '@/components/ProgressCircle';
import Toast from '@/components/Toast';
import { useAuthContext } from '@/context';
import { useAxios } from '@/hooks/useAxios';
import { useAlbums } from '@/hooks/useAlbums';
import SelectForm from '@/components/styledComponents/SelectForm';
import DialogForm from '@/components/DialogForm';
import DialogConfirm from '@/components/DialogConfirm';
import {
  clearInput,
} from '@/components/funcs';

const baseUrl = `${import.meta.env.VITE_VIDEO_STORAGE}`
if (!baseUrl) throw new Error('VITE_VIDEO_STORAGE not defined');

const URL_INIT = `${baseUrl}/multipart-upload-initiate`
const URL_PART = `${baseUrl}/upload-part`
const URL_COMPLETE_UPLOAD = `${baseUrl}/complete-multipart-upload`

export default function UploadPage() {
  const { user } = useAuthContext();
  // if (!user) return <div>Not authenticated</div>;

  const [isToastOpen, setIsToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState('success');

  const [albumOptions, setAlbumOptions] = useState([]);
  const [selectedAlbum, setSelectedAlbum] = useState(null);

  const [selectedAlbumName, setSelectedAlbumName] = useState(null);
  // const [selectedAlbumId, setSelectedAlbumId] = useState(null);

  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({});
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const axiosInstance = useAxios();

  const {
    data: albumList,
    isLoading: isLoadingAlbum,
    isError: isErrorAlbum,
    error: errorAlbum,
  } = useAlbums({
    user_id: user?.id || user?._id,
    album_id: null,
    skip: 0,
    limit: 0,
  });

  useEffect(() => {
    console.log('isLoadingAlbum: ', isLoadingAlbum);
  }, [isLoadingAlbum]);

  useEffect(() => {
    console.log('isErrorAlbum: ', isErrorAlbum);
  }, [isErrorAlbum]);

  useEffect(() => {
    console.log('errorAlbum: ', errorAlbum);
  }, [errorAlbum]);

  useEffect(() => {
    console.log('albumList: ', albumList);
    const albums = Array.isArray(albumList?.albums) ? albumList.albums : [];
    const options = albums.map(({ _id, album_name }) => ({
      label: album_name,
      value: _id,
    }));
    setAlbumOptions(options);
  }, [albumList]);

  useEffect(() => {
    console.log('selectedAlbum: ', selectedAlbum);
  }, [selectedAlbum]);

  useEffect(() => {
    console.log('selectedAlbumName: ', selectedAlbumName);
  }, [selectedAlbumName]);

  useEffect(() => {
    console.log('progress: ', progress);
  }, [progress]);

  useEffect(() => {
    setIsToastOpen(uploading);
    if (uploading) {
      // const keysString = Object.keys(progress).join(", ");
      // setToastMessage(JSON.stringify(keysString));
      setToastMessage('Uploading..');
      setToastSeverity('success');
    }
  }, [uploading, progress]);

  const onOpenDialog = () => setDialogOpen(true);
  const handleClose = () => setDialogOpen(false);
  const handleConfirm = (album_name) => {
    // console.log("handleConfirm: ", album_name);
    setSelectedAlbum({...album_name, _id: '' });
    setSelectedAlbumName(album_name.album_name);
    setAlbumOptions([...albumOptions, { label: album_name.album_name, value: '' }]);
    setDialogOpen(false);
  };

  const onChangeAlbumDropdown = (album_id) => {
    // console.log('Selected Album: ', album_id);
    const albums = Array.isArray(albumList?.albums) ? albumList.albums : [];
    const album = albums.find(({ _id }) => _id === album_id);
    if (!album) {
      setSelectedAlbum(null);
      setSelectedAlbumName(null);
      return;
    }
    // console.log('album: ', album);
    setSelectedAlbum(album);
    setSelectedAlbumName(album.album_name);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(prevFiles => {
      const existingFileNames = new Set(prevFiles.map(file => file.name));
      const newFiles = droppedFiles.filter(file => !existingFileNames.has(file.name));
      return [...prevFiles, ...newFiles];
    });
  };
  const handleFilesChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => {
      const existingFileNames = new Set(prevFiles.map(file => file.name));
      const newFiles = selectedFiles.filter(file => !existingFileNames.has(file.name));
      return [...prevFiles, ...newFiles];
    }
    )
  };

  const onUploadClear = () => {
    setFiles([])
    clearInput();
  };
  const onDeleteOneFile = (file) => {
    // delete one file from selectedFiles
    let updatedFiles = [...files];
    const idx = updatedFiles.findIndex((f) => f.name === file.name);
    updatedFiles.splice(idx, 1);
    setFiles(updatedFiles);
    clearInput();
  }

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploading(true);

    const chunkSize = 20 * 1024 * 1024; // 20 MB
    // const chunkSize = 40 * 1024 * 1024; // 20 MB
    const uploadFile = async (file, index) => {
      // const sanitizedFilename = sanitizeFilename(file.name);
      // console.log(`uploadFile: ${sanitizedFilename} - index: ${index} ${encodeURIComponent(sanitizedFilename)}`);
      const totalParts = Math.ceil(file.size / chunkSize);
      let uploadId = null;
      let videoId = null;
      let parts = [];
      let totalUploaded = 0; // Track uploaded bytes

      try {
        // Step 1: Initiate Multipart Upload
        const formDataInit = new URLSearchParams();
        formDataInit.append('file_name', file.name);

        const initResponse = await axiosInstance.post(
          URL_INIT,
          formDataInit.toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
          }
        );

        uploadId = initResponse.data.upload_id;
        videoId = initResponse.data.video_id;
        // Step 2: Upload each part
        for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
          const start = (partNumber - 1) * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const blob = file.slice(start, end);
          const uploadResponse = await axios.post(
            URL_PART,
            blob,
            {
              headers: {
                'file-name': file.name,
                // 'file-name': JSON.stringify(encodeURIComponent(sanitizedFilename)),
                // 'file-name': sanitizedFilename,
                'upload-id': uploadId,
                'part-number': partNumber,
                'video-id': videoId,
              },
              // Progress Tracking
              onUploadProgress: (progressEvent) => {
                const percentage = Math.round(((start + progressEvent.loaded) / file.size) * 100) - 1;
                setProgress(prev => ({ ...prev, [file.name]: percentage }));
                // setProgress(prev => ({ ...prev, [sanitizedFilename]: percentage }));
              },
            }
          );

          parts.push({
            ETag: uploadResponse.data.etag,
            PartNumber: partNumber,
          });

          totalUploaded += end - start;
        }

        // Step 3: Complete Multipart Upload
        const completeResponse = await axiosInstance.post(
          URL_COMPLETE_UPLOAD,
          {
            video_id: videoId,
            upload_id: uploadId,
            file_name: file.name,
            file_size: file.size,
            parts: parts,
            album_name: selectedAlbumName,
            // album_name: selectedAlbum?.album_name,
            // album_name: 'album-name-test',
          },
        );
        setProgress(prev => ({ ...prev, [file.name]: (prev[file.name] + (100 - prev[file.name])) }));

        console.log(`name: ${file.name} - totalParts: ${totalParts} - totalUploaded: ${totalUploaded}`);
        console.log('Upload complete!: ', completeResponse.data);
      } catch (e) {
        const err_msg = `${file.name} upload failed ${e?.response?.data || e}`
        console.error(err_msg);
        // setUploading(false);
        setToastSeverity('error');
        setToastMessage(err_msg);
      }
    };

    // Filter files that do not have 100% progress
    const filesToUpload = files.filter(file => (progress[file.name] || 0) < 100);
    // Process all selected files
    await Promise.all(filesToUpload.map((file, index) => uploadFile(file, index)));
    setUploading(false);
  };

  return (
    <div>

      <form onSubmit={handleUpload}>
        <Box
          sx={{
            border: '2px dashed #aaa',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'center',
            marginBottom: '10px',
          }}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <Typography>Drag & Drop files here or click to select files</Typography>
          <input
            style={{ display: 'none' }}
            id='file-input'
            type='file'
            multiple
            onChange={handleFilesChange}
          />
          <label htmlFor='file-input'>
            <Typography color='primary' sx={{ cursor: 'pointer' }}>Browse Files</Typography>
          </label>
        </Box>
        <Button
          id="uploadButton"
          type="submit"
          variant="contained"
          color="primary"
          sx={{ width: '100%' }}
        >
          Upload
        </Button>
      </form>

      {files.length > 0 && (
        <Box
          sx={{
            //   width: '100%'
            width: { xs: '100%', sm: '95%', md: '50%', lg: '50%', xl: '30%' },
            // backgroundColor: { xs: 'red', sm: 'blue', md: 'green', lg: 'purple', xl: 'orange' },
            padding: { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
            display: 'flex',        // Enables flexbox
            flexDirection: 'column', // Aligns children in a column
            justifyContent: 'start', // Centers items vertically
            alignItems: 'center',    // Centers items horizontally
            minHeight: '100vh',      // Ensures it takes full viewport height
            margin: '0 auto',       // Centers it horizontally when width is less than 100%
          }}
        >

          <List
            sx={{ width: '100%', bgcolor: 'background.paper' }}
            subheader={<ListSubheader>Add Album</ListSubheader>}
          >
            <ListItem>
              <ListItemText id="switch-list-label-wifi" primary="" />
              <SelectForm
                labelText={selectedAlbum?.album_name || 'Select or Create an Album'}
                options={albumOptions}
                onChange={(selected) => onChangeAlbumDropdown(selected)}
                selected={selectedAlbum?._id || ''}
              />
              <ListItemIcon sx={{ ml: 3 }}>
                <Tooltip title="Create Album">
                  <IconButton
                    variant="contained"
                    color="primary"
                    size="small"
                    onClick={() => {
                      console.log('add: ');
                      setDialogOpen(true);
                    }}
                  >
                    <AddCircleIcon />
                  </IconButton>
                </Tooltip>
              </ListItemIcon>

            </ListItem>
          </List>

          <List sx={{ width: '100%', bgcolor: 'background' }}>

            {files.map((file, idx) => (
              <ListItem
                key={idx}
                id={`multi-file-list-item-${idx}`}
                secondaryAction={
                  <IconButton
                    data-testid={`multi-fileDeleteButton-${idx}`}
                    id={`multi-fileDeleteButton-${idx}`}
                    edge="end"
                    aria-label="delete"
                    onClick={() => onDeleteOneFile(file)}
                    color="red">
                    <DeleteIcon />
                  </IconButton>
                }
              >

                <ListItemText
                  id={`file-size-${idx}`}
                  primary={file.name}
                  secondary={`${(file.size / (1024 * 1024)).toFixed(2)} MB`} />

                {
                  //if file has progress of 0 because it is newly uploaded, do not show the progress circle
                  progress[file.name] > 0 && (
                    <ProgressCircle value={progress[file.name] || 0} />
                  )
                }

              </ListItem>
            ))}
          </List>
          <Stack direction="row" spacing={2} justifyContent="end" sx={{ mt: '1%' }}>
            <Button
              id="multi-clear-btn"
              variant="contained"
              color="red"
              sx={{ 
                width: '100%', 
              }}
              onClick={onUploadClear}
            >
              Clear
            </Button>

          </Stack>
        </Box>

      )}


      <DialogForm open={dialogOpen} onClose={handleClose} onConfirm={handleConfirm} title="Create New Album">
        <TextField name="album_name" label="Album" fullWidth margin="dense" />
      </DialogForm>
      <Toast
        isOpen={isToastOpen}
        message={toastMessage}
        onClose={() => setIsToastOpen(false)}
        severity={toastSeverity}
        id={`upload-status-toast`}
      /> 

    </div>
  );
};
