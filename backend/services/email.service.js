import emailjs from '@emailjs/nodejs';

/**
 * Service to handle EmailJS communications
 */
export const sendOTPEmail = async (email, otp) => {
    const serviceId = process.env.EMAILJS_SERVICE_ID;
    const templateId = process.env.EMAILJS_TEMPLATE_ID;
    const publicKey = process.env.EMAILJS_PUBLIC_KEY;
    const privateKey = process.env.EMAILJS_PRIVATE_KEY;

    if (!serviceId || !templateId || !publicKey || !privateKey) {
        throw new Error('EmailJS environment variables are missing');
    }

    const templateParams = {
        to_email: email,
        reply_to: 'support@novastore.com',
        otp_code: otp,
        website_name: 'NOVA | Premium Essentials',
        expiry_minutes: '5',
        company_address: '123 Nova Street, Design District, NY 10012',
        current_year: new Date().getFullYear().toString()
    };

    // In development, log OTP to console so devs can see it without email
    if (process.env.NODE_ENV === 'development') {
        console.log(`\n[DEV] OTP for ${email}: ${otp}\n`);
    }

    try {
        await emailjs.send(
            serviceId,
            templateId,
            templateParams,
            {
                publicKey: publicKey,
                privateKey: privateKey // Automatically authenticates Node environment
            }
        );
        return true;
    } catch (error) {
        // emailjs provides detailed objects on failure
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        throw new Error(`EmailJS Error: ${errorMessage}`);
    }
};
