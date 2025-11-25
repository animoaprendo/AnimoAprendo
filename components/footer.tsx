import Image from "next/image";
import React from "react";

const Footer = () => {
  return (
    <footer className="bg-green-900 text-white py-10 sm:px-20 select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:justify-between sm:items-start gap-12">
        {/* Logo + Text */}
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <Image
            src="/images/AnimoAprendoWhiteTransparent.png"
            width={100}
            height={100}
            alt="logo"
            className="rounded-full mb-3"
          />
          <p className="text-sm">
            <span className="font-semibold">AnimoAprendo</span>
            <br />© {new Date().getFullYear()} - All rights reserved
          </p>
        </div>

        {/* Links Section */}
        <div className="flex flex-col items-center text-center sm:items-start sm:text-left sm:flex-row gap-12">
          {/* Quick Links */}
          <nav>
            <h6 className="text-lg font-semibold mb-3">Quick Links</h6>
            <ul className="flex flex-col gap-2">
              <li>
                <a href="https://portal.dlsud.edu.ph/mydlsud" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  DLSU-D Portal
                </a>
              </li>
              <li>
                <a href="https://dlsud.edu20.org" target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Schoolbook
                </a>
              </li>
            </ul>
          </nav>

          {/* Legal */}
          {/* <nav>
            <h6 className="text-lg font-semibold mb-3">Legal</h6>
            <ul className="flex flex-col gap-2">
              <li>
                <a href="#" className="hover:underline">
                  Terms of Use
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:underline">
                  Cookie Policy
                </a>
              </li>
            </ul>
          </nav> */}
        </div>
      </div>

      {/* Divider + Social */}
      {/* <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-green-700 flex flex-col sm:flex-row justify-between items-center text-sm gap-4">
        <p>Built with ❤️ for the Animo Community</p>
        <div className="flex gap-4">
          <a href="#" aria-label="Facebook" className="hover:opacity-75">
            🌐
          </a>
          <a href="#" aria-label="GitHub" className="hover:opacity-75">
            💻
          </a>
          <a href="#" aria-label="LinkedIn" className="hover:opacity-75">
            🔗
          </a>
        </div>
      </div> */}
    </footer>
  );
};

export default Footer;
