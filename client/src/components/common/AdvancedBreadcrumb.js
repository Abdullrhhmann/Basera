import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '../ui/shadcn';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/shadcn';

const AdvancedBreadcrumb = ({ maxItems = 3 }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Define breadcrumb labels for different routes
  const getBreadcrumbLabel = (pathname) => {
    const labels = {
      'admin': 'Dashboard',
      'properties': 'Properties',
      'users': 'Users',
      'inquiries': 'Inquiries',
      'leads': 'Leads',
      'add-property': 'Add Property',
      'edit-property': 'Edit Property',
      'add-user': 'Add User',
      'edit-user': 'Edit User',
      'view-user': 'View User',
      'edit-inquiry': 'Edit Inquiry',
      'view-inquiry': 'View Inquiry',
      'profile': 'Profile',
      'contact': 'Contact',
      'about': 'About',
    };
    return labels[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
  };

  // Define breadcrumb paths for navigation
  const getBreadcrumbPath = (index, pathnames) => {
    return '/' + pathnames.slice(0, index + 1).join('/');
  };

  // Create breadcrumb items
  const breadcrumbItems = pathnames.map((pathname, index) => ({
    label: getBreadcrumbLabel(pathname),
    path: getBreadcrumbPath(index, pathnames),
    isLast: index === pathnames.length - 1,
  }));

  // Determine if we need to show ellipsis
  const shouldShowEllipsis = breadcrumbItems.length > maxItems;
  const itemsToShow = shouldShowEllipsis ? breadcrumbItems.slice(-maxItems + 1) : breadcrumbItems;
  const hiddenItems = shouldShowEllipsis ? breadcrumbItems.slice(1, -maxItems + 1) : [];

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        {/* Always show home/dashboard */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin" className="text-slate-400 hover:text-white transition-colors">
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.length > 0 && (
          <>
            <BreadcrumbSeparator />
            
            {/* Show ellipsis with dropdown if needed */}
            {shouldShowEllipsis && (
              <>
                <BreadcrumbItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors">
                      <BreadcrumbEllipsis className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {hiddenItems.map((item, index) => (
                        <DropdownMenuItem key={index}>
                          <Link to={item.path} className="w-full">
                            {item.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}

            {/* Show visible items */}
            {itemsToShow.map((item, index) => (
              <React.Fragment key={item.path}>
                <BreadcrumbItem>
                  {item.isLast ? (
                    <BreadcrumbPage className="text-white font-medium">
                      {item.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link 
                        to={item.path} 
                        className="text-slate-400 hover:text-white transition-colors"
                      >
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!item.isLast && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default AdvancedBreadcrumb;
