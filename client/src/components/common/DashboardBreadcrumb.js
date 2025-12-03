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

const DashboardBreadcrumb = () => {
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
    };
    return labels[pathname] || pathname.charAt(0).toUpperCase() + pathname.slice(1);
  };

  // Define breadcrumb paths for navigation
  const getBreadcrumbPath = (index, pathnames) => {
    return '/' + pathnames.slice(0, index + 1).join('/');
  };

  return (
    <Breadcrumb className="mb-6">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin" className="text-basira-navy hover:text-basira-gold transition-colors">
              Dashboard
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {pathnames.length > 0 && (
          <>
            <BreadcrumbSeparator />
            {pathnames.map((pathname, index) => {
              const isLast = index === pathnames.length - 1;
              const path = getBreadcrumbPath(index, pathnames);
              const label = getBreadcrumbLabel(pathname);

              return (
                <React.Fragment key={path}>
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
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default DashboardBreadcrumb;
