import React from 'react';

const TopBanner = () => {
    return (
        <div className="TopBanner">
            <span className="TopBanner__spark">✦</span>
            <span className="TopBanner__text">
                A new version of Hive Blog is now available.
            </span>
            <a
                className="TopBanner__link"
                href="https://blog.openhive.network"
                target="_blank"
                rel="noopener noreferrer"
            >
                Try it now
                <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                </svg>
            </a>
        </div>
    );
};

export default TopBanner;
