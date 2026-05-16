import app from './app.js';

const PORT = parseInt(process.env.PORT ?? '4000', 10);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}/api`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
});
