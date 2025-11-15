import React from 'react';

export function NavLinks() {
    return (
        <div className="hidden items-center gap-4 mr-4 md:flex">
            <a
                href="https://www.linkedin.com/in/sachin-kumar-vishwakarma-3440a1296/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
            >
                LinkedIn
            </a>
            <a
                href="https://github.com/Sachin27182003"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
            >
                Github
            </a>
            <a
                href="https://www.instagram.com/sachin__._._/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
            >
                Instagram
            </a>
            <a
                href="https://discordapp.com/users/1188349191089569803"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors font-medium"
            >
                Discord
            </a>
        </div>
    );
}