export const validateEnv = () => {
    const requiredEnvVars = [
        'PORT',
        'MONGO_URI',
        'JWT_SECRET',
        'JWT_REFRESH_SECRET',
        'JWT_EXPIRES_IN',
        'NODE_ENV',
        'CLOUDINARY_CLOUD_NAME',
        'CLOUDINARY_API_KEY',
        'CLOUDINARY_API_SECRET',
        'STRIPE_SECRET_KEY',
        'EMAILJS_SERVICE_ID',
        'EMAILJS_TEMPLATE_ID',
        'EMAILJS_PUBLIC_KEY',
        'EMAILJS_PRIVATE_KEY',
        'CORS_ORIGIN',
        'STRIPE_WEBHOOK_SECRET',
    ];

    const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

    if (missingEnvVars.length > 0) {
        throw new Error(
            `Missing required environment variables: ${missingEnvVars.join(', ')}`
        );
    }
};
