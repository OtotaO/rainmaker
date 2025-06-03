import { useState, useEffect } from 'react';
import { z } from 'zod';
import { Button } from '../@/components/ui/button';
import { Card } from '../@/components/ui/card';
import { Textarea } from '../@/components/ui/textarea';
import { ErrorDisplay } from './common/ErrorDisplay';
import { validateSchema } from '../lib/validationUtils';

const descriptionSchema = z.object({
  description: z.string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description cannot exceed 5000 characters')
});

export function NewProjectWizard() {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState('');
  const [validation, setValidation] = useState<{success: boolean, errors?: Record<string, string[]>}>({success: false});
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout>>();

  // Load saved state on mount
  useEffect(() => {
    const saved = localStorage.getItem('projectWizardState');
    if (saved) {
      try {
        const { step, description } = JSON.parse(saved);
        setStep(step);
        setDescription(description);
      } catch (e) {
        console.error('Failed to load saved state', e);
      }
    }
  }, []);

  // Auto-save on changes
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    
    const timer = setTimeout(() => {
      localStorage.setItem('projectWizardState', JSON.stringify({
        step,
        description
      }));
    }, 30000);

    setAutoSaveTimer(timer);
    return () => clearTimeout(timer);
  }, [step, description]);

  // Validate on change
  useEffect(() => {
    const result = validateSchema(descriptionSchema, { description });
    setValidation(result);
  }, [description]);

  const handleContinue = () => {
    if (validation.success) {
      setStep(2);
    }
  };

  return (
    <Card title="New Project Wizard" className="max-w-3xl mx-auto">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your app in natural language (50-5000 characters)..."
              className="min-h-[200px]"
            />
            <div className={`text-sm mt-1 ${description.length < 50 ? 'text-orange-500' : 'text-gray-500'}`}>
              {description.length}/5000 characters
            </div>
          </div>

          {!validation.success && validation.errors && (
            <ErrorDisplay error={{
              id: 'validation-error',
              title: 'Validation Error',
              message: 'Please fix the following issues:',
              details: Object.values(validation.errors).flat().join('\n'),
              type: 'validation'
            }} />
          )}

          <div className="flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={() => setDescription('')}
            >
              Clear
            </Button>
            <Button 
              onClick={handleContinue}
              disabled={!validation.success}
            >
              Continue
            </Button>
          </div>
        </div>
      )}
      
      {/* Additional step components will go here */}
    </Card>
  );
}
