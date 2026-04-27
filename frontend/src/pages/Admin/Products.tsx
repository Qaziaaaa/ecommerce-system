import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '../../api/axios';
import { Plus, Search, MoreVertical, Edit2, Trash2, X, Upload, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// --- Optimized Image Slot Component ---
const ImageSlot = React.memo(({ index, initialUrl, onUrlChange }: { index: number, initialUrl: string, onUrlChange: (url: string) => void }) => {
    const [file, setFile] = React.useState<File | null>(null);
    const [preview, setPreview] = React.useState<string>(initialUrl || '');
    const [manualUrl, setManualUrl] = React.useState<string>(initialUrl || '');
    const [isUploading, setIsUploading] = React.useState(false);

    // Sync with initial URL when it changes (e.g. from modal open/reset)
    React.useEffect(() => {
        setPreview(initialUrl || '');
        setManualUrl(initialUrl || '');
        setFile(null);
    }, [initialUrl]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setManualUrl('');
            
            // Performance: Use createObjectURL instead of FileReader Base64
            const objectUrl = URL.createObjectURL(selectedFile);
            setPreview(objectUrl);
            
            // Cleanup previous object URLs if they exist
            return () => URL.revokeObjectURL(objectUrl);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const { data } = await axiosInstance.post('/upload', formData);
            setPreview(data.imageUrl);
            setFile(null);
            onUrlChange(data.imageUrl);
            toast.success(`Image ${index + 1} uploaded`);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Upload failed');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4 border border-[#2D2926]/5 p-5 bg-white/40 backdrop-blur-sm group/slot transition-all hover:bg-white/60">
            <div className="flex justify-between items-center">
                <p className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-30">View {index + 1}</p>
                {isUploading && <Loader2 size={12} className="animate-spin opacity-50" />}
            </div>
            
            <div className="aspect-square bg-[#EBE7E0]/50 border border-[#2D2926]/10 p-2 relative group overflow-hidden">
                {preview ? (
                    <img src={preview} alt={`Slot ${index + 1}`} className="w-full h-full object-cover mix-blend-multiply transition-transform duration-700 group-hover:scale-105" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#2D2926]/5">
                        <Upload size={24} className="opacity-10" />
                    </div>
                )}
                
                {isUploading && (
                    <div className="absolute inset-0 bg-[#EBE7E0]/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                        <div className="w-8 h-[2px] bg-[#2D2926]/10 overflow-hidden">
                            <div className="w-full h-full bg-[#2D2926] animate-[shimmer_1.5s_infinite]" />
                        </div>
                        <span className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-50">Transferring...</span>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    id={`file-upload-${index}`} 
                />
                <div className="flex flex-col gap-2">
                    <label 
                        htmlFor={`file-upload-${index}`}
                        className="cursor-pointer bg-white border border-[#2D2926]/10 px-3 py-2.5 text-[8px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-all text-center shadow-sm active:scale-[0.98]"
                    >
                        {file ? 'Re-select' : 'Choose File'}
                    </label>
                    {file && !isUploading && (
                        <button 
                            type="button" 
                            onClick={handleUpload}
                            className="bg-[#2D2926] text-[#EBE7E0] px-3 py-2.5 text-[8px] font-bold tracking-[0.2em] uppercase hover:shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Upload size={12} /> Sync Asset
                        </button>
                    )}
                </div>
                
                <div className="relative group/input">
                    <input 
                        type="text" 
                        placeholder="Static URL"
                        className="w-full bg-white border border-[#2D2926]/10 px-3 py-2 text-[10px] focus:ring-1 focus:ring-[#2D2926] outline-none transition-all placeholder:opacity-20"
                        value={manualUrl}
                        onChange={(e) => {
                            setManualUrl(e.target.value);
                            setPreview(e.target.value);
                            onUrlChange(e.target.value);
                        }}
                    />
                    <div className="absolute bottom-0 left-0 h-[1px] bg-[#2D2926] w-0 group-focus-within/input:w-full transition-all duration-500" />
                </div>
            </div>
        </div>
    );
});

export default function AdminProducts() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal & Form State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    
    // Performance Optimized Multi-image state: Only URLs are lifted to parent
    const [imageUrls, setImageUrls] = useState<string[]>(Array(3).fill(''));

    // Fetch Products — no staleTime so admin always sees fresh data
    const { data: products = [], isLoading } = useQuery({
        queryKey: ['admin-products'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/products?limit=100');
            return data.data.products;
        },
        staleTime: 0, // Always refetch for admin
        refetchOnWindowFocus: true,
    });

    // Fetch Categories
    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            const { data } = await axiosInstance.get('/categories');
            return data.data.categories;
        }
    });

    // Create Product Mutation
    const createMutation = useMutation({
        mutationFn: (newProduct: any) => axiosInstance.post('/products', newProduct),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['products-home'] });
            toast.success('Product created successfully');
            closeModal();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create product');
        }
    });

    // Update Product Mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => axiosInstance.patch(`/products/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['products-home'] });
            toast.success('Product updated successfully');
            closeModal();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update product');
        }
    });

    // Delete Mutation — optimistic update removes product immediately from UI
    const deleteMutation = useMutation({
        mutationFn: (id: string) => axiosInstance.delete(`/products/${id}`),
        onMutate: async (deletedId: string) => {
            // Cancel any outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['admin-products'] });
            // Snapshot previous value
            const previous = queryClient.getQueryData(['admin-products']);
            // Optimistically remove from list
            queryClient.setQueryData(['admin-products'], (old: any[]) =>
                (old || []).filter((p: any) => p._id !== deletedId)
            );
            return { previous };
        },
        onSuccess: () => {
            toast.success('Product deleted successfully');
            // Invalidate to sync with server
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
            queryClient.invalidateQueries({ queryKey: ['products'] });
            queryClient.invalidateQueries({ queryKey: ['products-home'] });
        },
        onError: (error: any, _id, context: any) => {
            // Roll back on error
            if (context?.previous) {
                queryClient.setQueryData(['admin-products'], context.previous);
            }
            toast.error(error.response?.data?.message || 'Failed to delete product');
        },
    });

    const filteredProducts = products?.filter((p: any) => 
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (typeof p.category === 'object' && p.category?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleUrlChange = (index: number, url: string) => {
        const newUrls = [...imageUrls];
        newUrls[index] = url;
        setImageUrls(newUrls);
    };

    const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        const productData: any = {
            name: formData.get('name'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price') as string),
            stock: parseInt(formData.get('stock') as string),
            category: formData.get('category'),
            isActive: true
        };

        // Collect only non-empty URLs
        const images = imageUrls.filter(url => !!url);
        
        productData.images = images.length > 0 ? images : (editingProduct?.images || []);

        if (editingProduct) {
            updateMutation.mutate({ id: editingProduct._id, data: productData });
        } else {
            createMutation.mutate(productData);
        }
    };

    const openModal = (product: any = null) => {
        setEditingProduct(product);
        if (product && product.images) {
            const initialUrls = Array(3).fill('').map((_, i) => product.images[i] || '');
            setImageUrls(initialUrls);
        } else {
            setImageUrls(Array(3).fill(''));
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
        resetUploadState();
    };

    const resetUploadState = () => {
        setImageUrls(Array(3).fill(''));
    };

    return (
        <div className="space-y-12">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="font-display text-4xl tracking-wide mb-2">INVENTORY</h1>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Manage your product collection</p>
                </div>
                <button 
                    onClick={() => openModal()}
                    className="bg-[#2D2926] text-[#EBE7E0] px-8 py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-all flex items-center gap-3"
                >
                    <Plus size={16} /> Add Product
                </button>
            </div>

            <div className="flex gap-4 p-4 border border-[#2D2926]/10 bg-white">
                <Search size={20} className="text-[#2D2926]/30" />
                <input 
                    type="text" 
                    placeholder="Search by name or category..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium placeholder:text-[#2D2926]/30"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white border border-[#2D2926]/10 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-[#2D2926]/10 bg-[#2D2926]/5">
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Product</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Category</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Price</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Stock</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase">Status</th>
                            <th className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2926]/10">
                        {isLoading ? (
                            [...Array(5)].map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="px-8 py-8 h-12 bg-[#2D2926]/5"></td>
                                </tr>
                            ))
                        ) : filteredProducts?.map((product: any) => (
                            <tr key={product._id} className="group hover:bg-[#2D2926]/5 transition-colors">
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-[#EBE7E0] border border-[#2D2926]/10 p-1">
                                            <img 
                                                src={product.images?.[0] || '/placeholder.png'} 
                                                alt={product.name}
                                                className="w-full h-full object-cover mix-blend-multiply"
                                            />
                                        </div>
                                        <div>
                                            <p className="font-display text-lg tracking-wide">{product.name}</p>
                                            <p className="text-[8px] font-bold opacity-30 font-mono tracking-widest">{product._id.toUpperCase()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-[10px] font-bold tracking-[0.2em] uppercase opacity-60">
                                    {product.category?.name || 'Uncategorized'}
                                </td>
                                <td className="px-8 py-6 text-sm font-bold">
                                    ${product.price?.toFixed(2)}
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`text-[10px] font-bold tracking-[0.2em] uppercase ${product.stock < 10 ? 'text-red-500' : 'opacity-60'}`}>
                                        {product.stock} Units
                                    </span>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-3 py-1 text-[8px] font-bold tracking-[0.2em] uppercase ${product.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {product.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => openModal(product)}
                                            className="p-2 hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (window.confirm('Delete this product?')) deleteMutation.mutate(product._id);
                                            }}
                                            className="p-2 hover:bg-red-500 hover:text-white transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2D2926]/40 backdrop-blur-sm">
                    <div className="bg-[#EBE7E0] border border-[#2D2926] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                        <div className="p-8 border-b border-[#2D2926]/10 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="font-display text-2xl tracking-wide uppercase">
                                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                                </h2>
                                <p className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-50 mt-1">
                                    Enter product details below
                                </p>
                            </div>
                            <button onClick={closeModal} className="p-2 hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveProduct} className="p-8 space-y-8">
                            {/* High-Performance Multi-Image Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">PRODUCT VISUALS GALLERY</label>
                                    <span className="text-[8px] font-bold tracking-[0.2em] uppercase opacity-20">3 View Limit</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {imageUrls.map((url, index) => (
                                        <ImageSlot 
                                            key={index}
                                            index={index}
                                            initialUrl={url}
                                            onUrlChange={(newUrl) => handleUrlChange(index, newUrl)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Product Name</label>
                                    <input 
                                        required 
                                        name="name" 
                                        defaultValue={editingProduct?.name}
                                        className="w-full bg-white border border-[#2D2926]/10 px-4 py-3 text-sm focus:ring-1 focus:ring-[#2D2926] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Category</label>
                                    <select 
                                        required 
                                        name="category" 
                                        defaultValue={editingProduct?.category?._id || editingProduct?.category}
                                        className="w-full bg-white border border-[#2D2926]/10 px-4 py-3 text-sm focus:ring-1 focus:ring-[#2D2926] outline-none transition-all appearance-none"
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map((cat: any) => (
                                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Price ($)</label>
                                    <input 
                                        required 
                                        type="number" 
                                        step="0.01" 
                                        name="price" 
                                        defaultValue={editingProduct?.price}
                                        className="w-full bg-white border border-[#2D2926]/10 px-4 py-3 text-sm focus:ring-1 focus:ring-[#2D2926] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Stock Quantity</label>
                                    <input 
                                        required 
                                        type="number" 
                                        name="stock" 
                                        defaultValue={editingProduct?.stock}
                                        className="w-full bg-white border border-[#2D2926]/10 px-4 py-3 text-sm focus:ring-1 focus:ring-[#2D2926] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-50">Description</label>
                                    <textarea 
                                        required 
                                        name="description" 
                                        rows={4}
                                        defaultValue={editingProduct?.description}
                                        className="w-full bg-white border border-[#2D2926]/10 px-4 py-3 text-sm focus:ring-1 focus:ring-[#2D2926] outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            <div className="pt-8 flex gap-4">
                                <button 
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="flex-1 bg-[#2D2926] text-[#EBE7E0] py-4 text-[10px] font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {editingProduct ? 'Update Product' : 'Create Product'}
                                </button>
                                <button 
                                    type="button" 
                                    onClick={closeModal}
                                    className="px-8 border border-[#2D2926] text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-[#2D2926] hover:text-[#EBE7E0] transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
