import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        // "document.documentElement.scrollTo" is the cross-browser way to reset scroll
        // to the top of the page when the route changes.
        // Wrap in setTimeout(0) to ensure the DOM has finished painting the new page
        // height before resetting the scroll.
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant',
            });
        }, 0);
    }, [pathname]);

    return null;
}
