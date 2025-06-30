import React from 'react';
import Navbar from '../components/Navbar';
// import RoleSwitcher from '../components/RoleSwitcher';
// import DarkModeButton from '../components/DarkModeButton';
import Footer from '../components/Footer';

export default function Layout({ children, title, settingsButton }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#eef6ff] px-16 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Navbar />
      {title && (
        <div className="px-8 pt-8">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-bold ml-12 mt-12 mb-6">{title}</h2>
            {settingsButton && settingsButton}
          </div>
        </div>
      )}
      <main className="flex-1 px-8">{children}</main>
      {/* <RoleSwitcher /> */}
      {/* <DarkModeButton /> */}
      <Footer />
    </div>
  );
}
