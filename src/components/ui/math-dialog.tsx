"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

interface MathDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (latex: string) => void;
}

interface MathTemplate {
  name: string;
  latex: string;
  description: string;
  category: string;
}

const mathTemplates: MathTemplate[] = [
  // Basic Operations
  { name: "Fraction", latex: "\\frac{a}{b}", description: "Simple fraction", category: "basic" },
  { name: "Square Root", latex: "\\sqrt{x}", description: "Square root", category: "basic" },
  { name: "Nth Root", latex: "\\sqrt[n]{x}", description: "Nth root", category: "basic" },
  { name: "Exponent", latex: "x^{n}", description: "Power/exponent", category: "basic" },
  { name: "Subscript", latex: "x_{n}", description: "Subscript", category: "basic" },
  
  // Algebra
  { name: "Quadratic Formula", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", description: "Quadratic formula", category: "algebra" },
  { name: "Binomial", latex: "(a + b)^2 = a^2 + 2ab + b^2", description: "Binomial expansion", category: "algebra" },
  { name: "Summation", latex: "\\sum_{i=1}^{n} x_i", description: "Summation notation", category: "algebra" },
  { name: "Product", latex: "\\prod_{i=1}^{n} x_i", description: "Product notation", category: "algebra" },
  
  // Calculus
  { name: "Derivative", latex: "\\frac{d}{dx}f(x)", description: "Derivative", category: "calculus" },
  { name: "Partial Derivative", latex: "\\frac{\\partial f}{\\partial x}", description: "Partial derivative", category: "calculus" },
  { name: "Integral", latex: "\\int_{a}^{b} f(x) dx", description: "Definite integral", category: "calculus" },
  { name: "Indefinite Integral", latex: "\\int f(x) dx", description: "Indefinite integral", category: "calculus" },
  { name: "Limit", latex: "\\lim_{x \\to a} f(x)", description: "Limit", category: "calculus" },
  
  // Geometry
  { name: "Pythagorean Theorem", latex: "a^2 + b^2 = c^2", description: "Pythagorean theorem", category: "geometry" },
  { name: "Circle Area", latex: "A = \\pi r^2", description: "Area of a circle", category: "geometry" },
  { name: "Angle", latex: "\\angle ABC", description: "Angle notation", category: "geometry" },
  { name: "Triangle", latex: "\\triangle ABC", description: "Triangle notation", category: "geometry" },
  
  // Statistics
  { name: "Mean", latex: "\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i", description: "Sample mean", category: "statistics" },
  { name: "Standard Deviation", latex: "\\sigma = \\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i - \\mu)^2}", description: "Standard deviation", category: "statistics" },
  { name: "Normal Distribution", latex: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{1}{2}(\\frac{x-\\mu}{\\sigma})^2}", description: "Normal distribution", category: "statistics" },
  
  // Logic & Sets
  { name: "Set Union", latex: "A \\cup B", description: "Set union", category: "logic" },
  { name: "Set Intersection", latex: "A \\cap B", description: "Set intersection", category: "logic" },
  { name: "Subset", latex: "A \\subseteq B", description: "Subset", category: "logic" },
  { name: "Element Of", latex: "x \\in A", description: "Element of set", category: "logic" },
  { name: "For All", latex: "\\forall x \\in A", description: "Universal quantifier", category: "logic" },
  { name: "There Exists", latex: "\\exists x \\in A", description: "Existential quantifier", category: "logic" },
];

const categories = [
  { id: "basic", name: "Basic", description: "Basic mathematical operations" },
  { id: "algebra", name: "Algebra", description: "Algebraic expressions and equations" },
  { id: "calculus", name: "Calculus", description: "Derivatives, integrals, and limits" },
  { id: "geometry", name: "Geometry", description: "Geometric formulas and notation" },
  { id: "statistics", name: "Statistics", description: "Statistical formulas and notation" },
  { id: "logic", name: "Logic & Sets", description: "Logic and set theory notation" },
];

export const MathDialog: React.FC<MathDialogProps> = ({
  open,
  onOpenChange,
  onInsert,
}) => {
  const [customLatex, setCustomLatex] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('basic');
  const [showPreview, setShowPreview] = useState(true);
  const [previewLatex, setPreviewLatex] = useState('');

  useEffect(() => {
    if (open) {
      setCustomLatex('');
      setPreviewLatex('');
    }
  }, [open]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleInsertTemplate = (template: MathTemplate) => {
    onInsert(template.latex);
    handleClose();
  };

  const handleInsertCustom = () => {
    if (!customLatex.trim()) {
      toast.error('Please enter a LaTeX expression');
      return;
    }
    onInsert(customLatex.trim());
    handleClose();
  };

  const handleCopyTemplate = (latex: string) => {
    navigator.clipboard.writeText(latex);
    toast.success('LaTeX copied to clipboard');
  };

  const handlePreviewCustom = () => {
    setPreviewLatex(customLatex);
  };

  const filteredTemplates = mathTemplates.filter(template => template.category === selectedCategory);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Insert Mathematical Expression</DialogTitle>
          <DialogDescription>
            Choose from templates or enter custom LaTeX code
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="templates" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="custom">Custom LaTeX</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-4 overflow-hidden">
            <div className="flex gap-4 h-[400px]">
              {/* Category Sidebar */}
              <div className="w-48 border-r pr-4">
                <Label className="text-sm font-medium mb-2 block">Categories</Label>
                <div className="space-y-1">
                  {categories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "ghost"}
                      size="sm"
                      className="w-full justify-start text-left"
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-xs text-muted-foreground">{category.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Templates Grid */}
              <div className="flex-1">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
                    {filteredTemplates.map((template, index) => (
                      <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{template.name}</CardTitle>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyTemplate(template.latex);
                                }}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <CardDescription className="text-xs">{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="bg-gray-50 p-2 rounded text-xs font-mono mb-2 break-all">
                            {template.latex}
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleInsertTemplate(template)}
                          >
                            Insert
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="latex-input">LaTeX Expression</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="latex-input"
                    placeholder="Enter LaTeX code (e.g., x^2 + y^2 = z^2)"
                    value={customLatex}
                    onChange={(e) => setCustomLatex(e.target.value)}
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={handlePreviewCustom}
                    disabled={!customLatex.trim()}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {previewLatex && (
                <div>
                  <Label>Preview</Label>
                  <div className="bg-gray-50 p-4 rounded border mt-1">
                    <div className="text-center">
                      <span className="text-sm text-muted-foreground">
                        LaTeX: {previewLatex}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                <p><strong>Common LaTeX syntax:</strong></p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li><code>\frac{"{a}"}{"{b}"}</code> - Fraction</li>
                  <li><code>\sqrt{"{x}"}</code> - Square root</li>
                  <li><code>x^{"{n}"}</code> - Superscript</li>
                  <li><code>x_{"{n}"}</code> - Subscript</li>
                  <li><code>\sum_{"{i=1}"}^{"{n}"}</code> - Summation</li>
                  <li><code>\int_{"{a}"}^{"{b}"}</code> - Integral</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <TabsContent value="custom" className="m-0">
            <Button onClick={handleInsertCustom} disabled={!customLatex.trim()}>
              Insert Expression
            </Button>
          </TabsContent>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
