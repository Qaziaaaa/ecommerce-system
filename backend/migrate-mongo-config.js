const config = {
  mongodb: {
    url: process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce',
    options: {},
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations',
  migrationFileExtension: '.js',
  moduleSystem: 'esm',
};

export default config;
