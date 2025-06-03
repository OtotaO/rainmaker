import { useEffect, useState } from 'react';
import { z } from 'zod';
import { ProductHighLevelDescriptionSchema, ProductHighLevelDescriptionSchema as ProductHighLevelDescriptionType } from '../../../shared/src/types'; // Import Zod schema and type
import { Button } from '../@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { ScrollArea } from '../@/components/ui/scroll-area';
import { CheckCircledIcon, PlusIcon } from '@radix-ui/react-icons';
import { Input } from '../@/components/ui/input';
import { Label } from '../@/components/ui/label';
import { Textarea } from '../@/components/ui/textarea';
import { motion } from 'framer-motion';
import { validateSchema, formatValidationErrors } from '../lib/validationUtils';

export interface ProductHighLevelDescriptionProps {
    setActiveProductHighLevelDescription: (productHighLevelDescription: ProductHighLevelDescriptionType) => void;
    activeProductHighLevelDescription?: ProductHighLevelDescriptionType | null;
}

export const ProductHighLevelDescription = ({ setActiveProductHighLevelDescription, activeProductHighLevelDescription }: ProductHighLevelDescriptionProps) => {
  const [productHighLevelDescriptions, setProductHighLevelDescriptions] = useState<ProductHighLevelDescriptionType[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductHighLevelDescriptionType | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null); // For dialog-specific errors

  const fetchProductHighLevelDescriptions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:3001/api/product-high-level-descriptions');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log('Fetched products:', data);

      const validationResult = validateSchema(z.array(ProductHighLevelDescriptionSchema), data);
      if (validationResult.success && validationResult.data) {
        setProductHighLevelDescriptions(validationResult.data);
      } else {
        console.error('Error parsing product high level descriptions:', formatValidationErrors(validationResult.errors, validationResult.errorMessages));
        setError('Error parsing product data from server.');
        setProductHighLevelDescriptions([]); // Clear or handle as appropriate
      }
    } catch (fetchError) {
      console.error('Error fetching product high level descriptions:', fetchError);
      setError(`Failed to fetch products: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductHighLevelDescriptions();
  }, []);

  const handleCreateProduct = async () => {
    setFormError(null); // Clear previous form errors

    const productDataToValidate = {
      id: `temp-${Date.now()}`, // Temporary ID, will be overwritten by backend
      name: newProductName,
      description: newProductDescription,
      createdAt: new Date().toISOString(), // Will be set by backend
      updatedAt: new Date().toISOString(), // Will be set by backend
    };

    const validationResult = validateSchema(ProductHighLevelDescriptionSchema, productDataToValidate);

    if (!validationResult.success) {
      const formattedErrors = formatValidationErrors(validationResult.errors, validationResult.errorMessages);
      setFormError(formattedErrors);
      console.error("Validation failed for new product:", formattedErrors);
      return;
    }
    
    const validatedProductData = validationResult.data!; // data is guaranteed if success is true

    setIsLoading(true);
    try {
      // TODO: Replace with actual API call when backend is ready
      // For now, simulate API success by adding directly to local state
      // const response = await fetch('http://localhost:3001/api/product-high-level-descriptions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name: validatedProductData.name, description: validatedProductData.description }) // Send only necessary fields
      // });
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => ({ message: 'Failed to save product to backend and parse error response.' }));
      //   throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      // }
      // const savedProduct = await response.json();
      // const parsedSavedProductValidation = validateSchema(ProductHighLevelDescriptionSchema, savedProduct);
      // if (!parsedSavedProductValidation.success || !parsedSavedProductValidation.data) {
      //   console.error('Invalid product data from server:', formatValidationErrors(parsedSavedProductValidation.errors, parsedSavedProductValidation.errorMessages));
      //   throw new Error('Received invalid product data from server.');
      // }
      // const finalProduct = parsedSavedProductValidation.data;

      // Using validatedProductData for now as placeholder for backend response
      const finalProduct = validatedProductData; 

      setProductHighLevelDescriptions(prev => [...prev, finalProduct]);
      setActiveProductHighLevelDescription(finalProduct);
      
      setNewProductName('');
      setNewProductDescription('');
      setIsCreatingNew(false);
      setFormError(null);
    } catch (creationError) {
      console.error('Error creating product:', creationError);
      setFormError(`Failed to create product: ${creationError instanceof Error ? creationError.message : String(creationError)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const isCreateButtonDisabled = isLoading || !newProductName.trim() || newProductDescription.trim().length < 50;


  if (isLoading && productHighLevelDescriptions.length === 0) { // Only show initial full page load if no products yet
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-primary font-medium">Loading products...</p>
      </div>
    );
  }

  if (error && productHighLevelDescriptions.length === 0) { // Show full page error if initial fetch fails
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg shadow-sm my-6 max-w-4xl mx-auto"
      >
        <div className="flex items-center">
          <svg className="h-6 w-6 mr-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-lg font-medium">{error}</h3>
        </div>
        <div className="mt-4">
          <Button 
            onClick={fetchProductHighLevelDescriptions}
            className="bg-destructive/10 hover:bg-destructive/20 text-destructive"
          >
            Try Again
          </Button>
        </div>
      </motion.div>
    );
  }
  
  // Simplified isCreateButtonDisabled logic, actual validation happens on submit
  // const isCreateButtonDisabled = isLoading || !newProductName.trim() || newProductDescription.trim().length < 50;


  if (productHighLevelDescriptions.length === 0 && !isCreatingNew) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <h2 className="text-2xl font-bold text-center text-primary">No Product Contexts Found</h2>
        <Card className="border-0 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-background/50 z-0"></div>
          <CardContent className="relative z-10 pt-8 pb-8 px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <PlusIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Define Product/Feature Context</h3>
              <p className="mb-6 text-muted-foreground">No contexts have been defined yet. Create one to begin.</p>
              <Button 
                onClick={() => { setIsCreatingNew(true); setFormError(null); }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create New Context
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-primary">
          {activeProductHighLevelDescription ? "Active Context:" : "Select or Create Context"}
        </h2>
        <Button 
          onClick={() => { setIsCreatingNew(true); setFormError(null); }}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          New Context
        </Button>
      </div>
      
      {activeProductHighLevelDescription && (
         <Card className="border-primary shadow-md bg-primary/5">
           <CardHeader>
             <CardTitle className="text-primary">{activeProductHighLevelDescription.name}</CardTitle>
           </CardHeader>
           <CardContent className="prose prose-sm max-w-none prose-invert-in-dark text-muted-foreground">
             <ReactMarkdown rehypePlugins={[rehypeRaw, rehypeSanitize]}>
               {activeProductHighLevelDescription.description}
             </ReactMarkdown>
           </CardContent>
         </Card>
       )}

      <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-sm p-6 space-y-6">
        <h3 className="text-xl font-semibold text-card-foreground">Available Contexts</h3>
        {productHighLevelDescriptions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {productHighLevelDescriptions.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card 
                  className={`cursor-pointer hover:shadow-lg transition-all duration-200 overflow-hidden relative ${
                    activeProductHighLevelDescription?.id === product.id 
                      ? 'border-2 border-primary shadow-lg bg-primary/10' 
                      : 'border-border hover:border-primary/50 bg-card'
                  }`}
                  onClick={() => setActiveProductHighLevelDescription(product)}
                >
                  {activeProductHighLevelDescription?.id === product.id && (
                    <div className="absolute top-2 right-2 p-1 bg-primary rounded-full">
                      <CheckCircledIcon className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-card-foreground text-base">{product.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-xs line-clamp-2">{product.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No contexts defined yet. Click "New Context" to create one.</p>
        )}
      </div>

      <Dialog open={isCreatingNew} onOpenChange={(open) => { if (!open) { setIsCreatingNew(false); setFormError(null); }}}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-primary">Create New Product/Feature Context</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {formError && (
              <div className="bg-destructive/10 border border-destructive text-destructive text-sm px-3 py-2 rounded-md">
                {formError}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-card-foreground">Context Name</Label>
              <Input 
                id="name" 
                value={newProductName} 
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="E.g., My SaaS App, User Profile Feature"
                className="border-border focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-card-foreground">Context Description (min 50 chars)</Label>
              <Textarea 
                id="description" 
                value={newProductDescription} 
                onChange={(e) => setNewProductDescription(e.target.value)}
                placeholder="Describe the overall product or the existing project if adding a feature..." 
                rows={5}
                className="border-border focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">
                {newProductDescription.length} / 50 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              className="border-border text-card-foreground hover:bg-accent"
              onClick={() => { setIsCreatingNew(false); setFormError(null); }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateProduct}
              disabled={isCreateButtonDisabled}
              className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Context'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
