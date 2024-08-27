"use client";

import { useState } from "react";
import { Box, Button, Stack, TextField, Tabs, Tab, Typography, Card, CardContent } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SearchIcon from '@mui/icons-material/Search';

// UC colors
const LIGHT_BLUE = '#B0C4DE'; // Light Steel Blue
const WHITE = '#FFFFFF';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?"
    }
  ]);
  const [message, setMessage] = useState('');
  const [tabIndex, setTabIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [professorData, setProfessorData] = useState(null);

  const sendMessage = async () => {
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: '' }
    ]);
    setMessage('');
    const response = fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, { role: "user", content: message }])
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';
      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text }
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  const searchProfessors = async () => {
    // Fetch professor data based on the search query
    const response = await fetch(`/api/professors?query=${searchQuery}`);
    const data = await response.json();
    setProfessorData(data);
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor={LIGHT_BLUE}
      color={WHITE}
      p={3}
    >
      <Stack
        direction={'column'}
        width="500px"
        height="700px"
        border={`1px solid ${WHITE}`}
        borderRadius={8}
        p={2}
        spacing={3}
        bgcolor={WHITE}
        boxShadow="0px 4px 8px rgba(0, 0, 0, 0.2)"
      >
        <Tabs value={tabIndex} onChange={handleTabChange} aria-label="tabs">
          <Tab label="Chat" />
          <Tab label="Search" />
          <Tab label="Profile" />
        </Tabs>
        
        {tabIndex === 0 && (
          <Stack
            direction={'column'}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === 'assistant' ? 'flex-start' : 'flex-end'
                }
              >
                <Box
                  bgcolor={
                    message.role === 'assistant'
                      ? WHITE
                      : LIGHT_BLUE
                  }
                  color={
                    message.role === 'assistant'
                      ? LIGHT_BLUE
                      : WHITE
                  }
                  borderRadius={16}
                  p={2}
                  maxWidth="80%"
                  boxShadow="0px 2px 4px rgba(0, 0, 0, 0.1)"
                >
                  {message.content}
                </Box>
              </Box>
            ))}
            <Stack direction={'row'} spacing={2}>
              <TextField
                label="Message"
                fullWidth
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                variant="outlined"
                size="small"
              />
              <Button 
                variant="contained" 
                color="primary" 
                onClick={sendMessage}
                endIcon={<SendIcon />}
                sx={{ backgroundColor: LIGHT_BLUE }}
              >
                Send
              </Button>
            </Stack>
          </Stack>
        )}

        {tabIndex === 1 && (
          <Stack direction={'column'} spacing={2}>
            <TextField
              label="Search Professors"
              fullWidth
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="outlined"
              size="small"
              endAdornment={<SearchIcon />}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={searchProfessors}
              sx={{ backgroundColor: LIGHT_BLUE }}
            >
              Search
            </Button>
            <Stack spacing={2}>
              {professorData && professorData.map((professor) => (
                <Card key={professor.id} variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{professor.name}</Typography>
                    <Typography variant="body2">Subject: {professor.subject}</Typography>
                    <Typography variant="body2">Rating: {professor.rating}</Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </Stack>
        )}

        {tabIndex === 2 && (
          <Box>
            <Typography variant="h6" gutterBottom>Professor Profile</Typography>
            {/* Placeholder for profile details */}
            <Typography variant="body1">Select a professor to view details.</Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
