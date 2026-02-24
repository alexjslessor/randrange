import * as React from 'react';
import Link from '@mui/material/Link';
import {
  TextField,
  Button,
  Typography,
  Container
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from "../context";

export default function LoginPage() {
  // const [form, setForm] = React.useState({ email: '', password: '' });
  const [form, setForm] = React.useState({ username: '', password: '' });
  const [error, setError] = React.useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const auth = useAuthContext();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await auth.loginAction(form);
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      navigate("/deployments");
    } catch (error) {
      setError(error?.response?.data?.detail || 'Error');
    }
    // const result = await auth.loginUser(form);
    // if (result.error) {
    //   setError(result.error);
    // } else {
    //   navigate('/'); // Redirect after successful login
    // }

  };
  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Sign In
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Username"
          name="username" // NOTE: name & value must be same field
          value={form.username}
          onChange={handleChange}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          margin="normal"
        />
        <Button type="submit" variant="contained" color="primary">
          Sign In
        </Button>
        {error && (
          <Typography color="error" mt={2}>
            {error}
          </Typography>
        )}
      </form>

      <Typography variant="body1" mt={2}>
        Dont have an account?{' '}
        <Link href="/register">Register here</Link>
      </Typography>

    </Container>
  );
}
