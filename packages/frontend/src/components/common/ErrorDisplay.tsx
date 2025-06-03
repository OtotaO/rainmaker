import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../@/components/ui/button';
import { AlertTriangleIcon, XCircleIcon, InfoIcon, CheckCircleIcon } from 'lucide-react';

export interface AppErrorAction {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export interface AppError {
  id: string;
  title: string;
  message: string;
  details?: string;
  type: 'validation' | 'api' | 'internal' | 'user' | 'success'; // Added 'success' for general notifications
  timestamp?: Date; // Optional, can be set by the error source
  actions?: AppErrorAction[];
  onDismiss?: (id: string) => void;
}

interface ErrorDisplayProps {
  error: AppError;
}

const typeStyles = {
  validation: {
    icon: <XCircleIcon className="h-6 w-6 text-red-500" />,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    textColor: 'text-red-700',
    titleColor: 'text-red-800',
  },
  api: {
    icon: <AlertTriangleIcon className="h-6 w-6 text-yellow-500" />,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
    textColor: 'text-yellow-700',
    titleColor: 'text-yellow-800',
  },
  internal: {
    icon: <XCircleIcon className="h-6 w-6 text-purple-500" />,
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-700',
    titleColor: 'text-purple-800',
  },
  user: { // For errors explicitly caused by user input that isn't schema validation
    icon: <InfoIcon className="h-6 w-6 text-blue-500" />,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-700',
    titleColor: 'text-blue-800',
  },
  success: {
    icon: <CheckCircleIcon className="h-6 w-6 text-green-500" />,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    textColor: 'text-green-700',
    titleColor: 'text-green-800',
  }
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const styles = typeStyles[error.type] || typeStyles.internal; // Default to internal error style

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-lg shadow-md mb-6 border ${styles.bgColor} ${styles.borderColor}`}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3 pt-0.5">
          {styles.icon}
        </div>
        <div className="flex-grow">
          <h3 className={`text-lg font-semibold ${styles.titleColor}`}>{error.title}</h3>
          <p className={`mt-1 text-sm ${styles.textColor}`}>{error.message}</p>
          {error.details && (
            <div className="mt-2">
              <Button
                variant="link"
                size="sm"
                className={`p-0 h-auto ${styles.textColor} hover:${styles.textColor}/80`}
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              {showDetails && (
                <pre className={`mt-1 p-2 text-xs bg-black/5 rounded whitespace-pre-wrap ${styles.textColor}`}>
                  {error.details}
                </pre>
              )}
            </div>
          )}
        </div>
        {error.onDismiss && (
          <div className="ml-4 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={`p-1 h-auto ${styles.textColor} hover:${styles.textColor}/80`}
              onClick={() => error.onDismiss && error.onDismiss(error.id)}
              aria-label="Dismiss"
            >
              <XCircleIcon className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
      {error.actions && error.actions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-current/20 flex justify-end space-x-2">
          {error.actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              variant={action.variant || 'default'}
              size="sm"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ErrorDisplay;
