import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/shadcn';

const WebsiteBreadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Define breadcrumb labels for different routes
  const getBreadcrumbLabel = (pathname) => {
    const labels = {
      'admin': 'Dashboard',
      'properties': 'Properties',
      'inquiries': 'Inquiries',
      'leads': 'Leads',
      'users': 'Users',
      'launches': 'Launches',
      'about': 'About Us',
      'contact': 'Contact',
      'login': 'Login',
      'register': 'Register',
      'profile': 'Profile',
    };
    return labels[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
  };

  // Define breadcrumb paths for navigation
  const getBreadcrumbPath = (index, pathnames) => {
    return '/' + pathnames.slice(0, index + 1).join('/');
  };

  // Only show breadcrumb on admin/dashboard pages
  const isAdminPage = pathnames[0] === 'admin' || pathnames[0] === 'profile';
  
  if (!isAdminPage) {
    return null;
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/" className="text-basira-navy hover:text-basira-gold transition-colors">
                  Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            
            {pathnames.map((pathname, index) => {
              const isLast = index === pathnames.length - 1;
              const path = getBreadcrumbPath(index, pathnames);
              const label = getBreadcrumbLabel(pathname);

              return (
                <React.Fragment key={path}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {isLast ? (
                      <BreadcrumbPage className="text-basira-gold font-medium">
                        {label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link 
                          to={path} 
                          className="text-basira-navy hover:text-basira-gold transition-colors"
                        >
                          {label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
};

export default WebsiteBreadcrumb;
