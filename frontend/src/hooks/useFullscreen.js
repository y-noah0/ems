import { useState, useEffect } from 'react';

const useFullscreen = () => {
    const [isFullscreen, setIsFullscreen] = useState(
        document.fullscreenElement != null
    );

    useEffect(() => {
        const onFullscreenChange = () => {
            setIsFullscreen(document.fullscreenElement != null);
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('webkitfullscreenchange', onFullscreenChange); // Safari
        document.addEventListener('mozfullscreenchange', onFullscreenChange); // Firefox
        document.addEventListener('MSFullscreenChange', onFullscreenChange); // IE/Edge

        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
            document.removeEventListener('mozfullscreenchange', onFullscreenChange);
            document.removeEventListener('MSFullscreenChange', onFullscreenChange);
        };
    }, []);

    return isFullscreen;
};

export default useFullscreen;
