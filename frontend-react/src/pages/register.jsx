import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Link } from '@mui/material';
import { useRegister } from '@/hooks/useRegister';
import { useNavigate } from 'react-router-dom';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { mutate: registerUser, isPending } = useRegister();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setErrorMessage('');

    registerUser(
      {
        username: form.username,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
      },
      {
        onError: (err) => setErrorMessage(err.message),
        onSuccess: () => navigate('/login'),
      }
    );
  };

  return (
    <Container maxWidth="sm">
      <Typography variant="h4" component="h1" gutterBottom>
        Register
      </Typography>
      <form onSubmit={handleSubmit}>
        <TextField fullWidth label="Username" name="username" value={form.username} onChange={handleChange} margin="normal" required />
        {/* <TextField fullWidth label="Email" name="email" type="email" value={form.email} onChange={handleChange} margin="normal" required /> */}
        {/* <TextField fullWidth label="First Name" name="first_name" value={form.first_name} onChange={handleChange} margin="normal" /> */}
        {/* <TextField fullWidth label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} margin="normal" /> */}
        <TextField fullWidth label="Password" type="password" name="password" value={form.password} onChange={handleChange} margin="normal" required />
        <TextField fullWidth label="Confirm Password" type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} margin="normal" required />
        <Button type="submit" variant="contained" color="primary" disabled={isPending}>
          {isPending ? 'Registering...' : 'Register'}
        </Button>
        {errorMessage && <Typography color="error" mt={2}>{errorMessage}</Typography>}
        {error && <Typography color="error" mt={2}>{error}</Typography>}
      </form>
      <Typography variant="body1" mt={2}>
        Already have an account?{' '}
        <Link href="/login">Login here</Link>
      </Typography>
    </Container>
  );
}
