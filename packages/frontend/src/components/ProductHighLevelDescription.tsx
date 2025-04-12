import { useEffect, useState } from 'react';
import { ProductHighLevelDescriptionSchema } from '../../../shared/src/types';
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

export interface ProductHighLevelDescriptionProps {
    setActiveProductHighLevelDescription: (productHighLevelDescription: ProductHighLevelDescriptionSchema) => void;
    activeProductHighLevelDescription?: ProductHighLevelDescriptionSchema | null;
}

export const ProductHighLevelDescription = ({ setActiveProductHighLevelDescription, activeProductHighLevelDescription }: ProductHighLevelDescriptionProps) => {
  const [productHighLevelDescriptions, setProductHighLevelDescriptions] = useState<ProductHighLevelDescriptionSchema[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductHighLevelDescriptionSchema | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      try {
        // Handle empty array case
        if (Array.isArray(data) && data.length === 0) {
          setProductHighLevelDescriptions([]);
        } else {
          const parsedData = ProductHighLevelDescriptionSchema.array().parse(data);
          setProductHighLevelDescriptions(parsedData);
        }
      } catch (error) {
        console.error('Error parsing product high level descriptions:', error);
        setError('Error parsing product data');
      }
    } catch (error) {
      console.error('Error fetching product high level descriptions:', error);
      setError(`Failed to fetch products: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductHighLevelDescriptions();
  }, []);

  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      alert('Product name is required');
      return;
    }

    setIsLoading(true);
    try {
      // Create a dummy product object for testing
      const newProduct = {
        id: `temp-${Date.now()}`,
        name: newProductName,
        description: newProductDescription || 'No description provided',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Normally you would POST to API here, but since it's not working yet,
      // we'll just use the dummy product locally
      // const response = await fetch('http://localhost:3001/api/product-high-level-descriptions', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name: newProductName, description: newProductDescription })
      // });
      // const data = await response.json();
      
      // Update local state with the new product
      setProductHighLevelDescriptions([...productHighLevelDescriptions, newProduct]);
      
      // Set it as the active product
      setActiveProductHighLevelDescription(newProduct);
      
      // Reset form
      setNewProductName('');
      setNewProductDescription('');
      setIsCreatingNew(false);
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-primary font-medium">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg shadow-sm mb-6"
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

  if (productHighLevelDescriptions.length === 0 && !isCreatingNew) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-4xl mx-auto"
      >
        <h2 className="text-2xl font-bold text-center text-primary">No Products Found</h2>
        <Card className="border-0 shadow-md overflow-hidden bg-card/50 backdrop-blur-sm">
          <div className="absolute inset-0 bg-background/50 z-0"></div>
          <CardContent className="relative z-10 pt-8 pb-8 px-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <PlusIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-card-foreground">Get Started</h3>
              <p className="mb-6 text-muted-foreground">No products have been created yet. Create your first product to begin the development process.</p>
              <Button 
                onClick={() => setIsCreatingNew(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create New Product
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
        <h2 className="text-2xl font-bold text-primary">Active Product</h2>
        <Button 
          onClick={() => setIsCreatingNew(true)} 
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all duration-200"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          New Product
        </Button>
      </div>
      
      <div className="bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {productHighLevelDescriptions.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card 
                className={`cursor-pointer hover:shadow-md transition-all duration-200 overflow-hidden relative ${
                  activeProductHighLevelDescription?.name === product.name 
                    ? 'border-primary shadow-md bg-primary/5' 
                    : 'border-border hover:border-primary bg-card'
                }`}
                onClick={() => setSelectedProduct(product)}
              >
                {activeProductHighLevelDescription?.name === product.name && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                )}
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-card-foreground">{product.name}</CardTitle>
                  {activeProductHighLevelDescription?.name === product.name && (
                    <CheckCircledIcon className="h-5 w-5 text-primary" />
                  )}
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>

        <Dialog open={selectedProduct !== null} onOpenChange={(open: boolean) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-primary">{selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="prose prose-sm max-w-none prose-invert-in-dark">
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  className="text-muted-foreground text-sm leading-relaxed"
                >
                  {selectedProduct?.description || ''}
                </ReactMarkdown>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button 
                variant="default"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                onClick={() => {
                  if (selectedProduct) {
                    setActiveProductHighLevelDescription(selectedProduct);
                    setSelectedProduct(null);
                  }
                }}
              >
                Select
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreatingNew} onOpenChange={(open) => !open && setIsCreatingNew(false)}>
          <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-sm">
            <DialogHeader>
              <DialogTitle className="text-primary">Create New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-card-foreground">Product Name</Label>
                <Input 
                  id="name" 
                  value={newProductName} 
                  onChange={(e) => setNewProductName(e.target.value)}
                  placeholder="Enter product name"
                  className="border-border focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-card-foreground">Description</Label>
                <Textarea 
                  id="description" 
                  value={newProductDescription} 
                  onChange={(e) => setNewProductDescription(e.target.value)}
                  placeholder="Enter product description" 
                  rows={5}
                  className="border-border focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline"
                className="border-border text-card-foreground hover:bg-card"
                onClick={() => setIsCreatingNew(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProduct}
                disabled={!newProductName.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:bg-primary/40 disabled:cursor-not-allowed"
              >
                Create Product
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
};
