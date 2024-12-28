import { useEffect, useState } from 'react';
import { ProductHighLevelDescriptionSchema } from '../../../shared/src/types';
import { Button } from '../@/components/ui/button';
import { Card, CardHeader, CardTitle } from '../@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { ScrollArea } from '../@/components/ui/scroll-area';
import { CheckCircledIcon } from '@radix-ui/react-icons';

export interface ProductHighLevelDescriptionProps {
    setActiveProductHighLevelDescription: (productHighLevelDescription: ProductHighLevelDescriptionSchema) => void;
    activeProductHighLevelDescription?: ProductHighLevelDescriptionSchema | null;
}

export const ProductHighLevelDescription = ({ setActiveProductHighLevelDescription, activeProductHighLevelDescription }: ProductHighLevelDescriptionProps) => {
  const [productHighLevelDescriptions, setProductHighLevelDescriptions] = useState<ProductHighLevelDescriptionSchema[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductHighLevelDescriptionSchema | null>(null);

  useEffect(() => {
    const fetchProductHighLevelDescriptions = async () => {
      const response = await fetch('http://localhost:3001/api/product-high-level-descriptions');
      const data = await response.json();

      try {
        const parsedData = ProductHighLevelDescriptionSchema.array().parse(data);
        setProductHighLevelDescriptions(parsedData);
      } catch (error) {
        console.error('Error parsing product high level descriptions:', error);
      }
    };

    fetchProductHighLevelDescriptions();
  }, []);

  if (!productHighLevelDescriptions.length) {
    return <p>Loading...</p>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-bold">Active Product</h2>
      
      <div className="bg-white rounded-lg border p-6 space-y-6">
        <div className="grid grid-cols-1 gap-4">
          {productHighLevelDescriptions.map((product, index) => (
            <Card 
              key={index} 
              className={`cursor-pointer hover:shadow-md transition-shadow relative ${activeProductHighLevelDescription?.name === product.name ? 'border-blue-500 shadow-md' : ''}`}
              onClick={() => setSelectedProduct(product)}
            >
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{product.name}</CardTitle>
                {activeProductHighLevelDescription?.name === product.name && (
                  <CheckCircledIcon className="h-5 w-5 text-blue-500" />
                )}
              </CardHeader>
            </Card>
          ))}
        </div>

        <Dialog open={selectedProduct !== null} onOpenChange={(open: boolean) => !open && setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedProduct?.name}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown 
                  rehypePlugins={[rehypeRaw, rehypeSanitize]}
                  className="text-gray-600 text-sm leading-relaxed"
                >
                  {selectedProduct?.description || ''}
                </ReactMarkdown>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button 
                variant="default"
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
      </div>
    </div>
  );
};
