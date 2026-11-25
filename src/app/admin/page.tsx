'use client';

import React, { useState, useEffect, useRef } from 'react';
import { demoStore, CATALOG_UPDATED_EVENT } from '@/lib/demo/service';
import { Product, Category } from '@/types';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  Plus,
  Trash2,
  Sparkles,
  Building2,
  QrCode,
  CreditCard,
  FileText,
  CheckCircle2,
  ShieldCheck,
  Lock,
  RotateCcw,
  Upload,
  Pencil,
  Cloud,
  FileSpreadsheet,
  Search,
  Image as ImageIcon,
  ExternalLink,
  X,
} from 'lucide-react';
import { createSicrediPayment } from '@/lib/sicredi/client';
import { SicrediPaymentMethod, SicrediPaymentResponse } from '@/lib/sicredi/types';
import { SicrediPaymentResultCard } from '@/components/SicrediPaymentWidgets';

const SICREDI_ADMIN_SETTINGS_KEY = 'santo_antonio_sicredi_admin_config';

/**
 * Redimensiona e comprime uma imagem enviada do computador/celular para JPEG otimizado (~20-35KB),
 * permitindo salvar fotos reais diretamente no Cloud Firestore e carregar instantaneamente no site.
 */
async function compressImageFileToDataUrl(file: File, maxSize = 520, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagem inválido.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Não foi possível processar a imagem.'));
          return;
        }
        ctx.fillStyle = '#FAF5EE';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminPage() {
  const { user, loading, isAdmin, elevateToAdmin } = useAuth();
  const [tab, setTab] = useState<'products' | 'dashboard' | 'categories' | 'sicredi'>('products');

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [categoriesList] = useState<Category[]>(demoStore.getCategories());

  const [adminPinInput, setAdminPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [formFeedback, setFormFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [syncingCloud, setSyncingCloud] = useState(false);

  // Filtro e busca de produtos no Admin
  const [adminSearch, setAdminSearch] = useState('');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('all');

  // Formulário de Cadastro / Edição de Produto
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodPromoPrice, setProdPromoPrice] = useState('');
  const [prodCategory, setProdCategory] = useState(categoriesList[0]?.slug || 'imagens-sacras');
  const [prodStock, setProdStock] = useState('15');
  const [prodMaterial, setProdMaterial] = useState('');
  const [prodVariantsText, setProdVariantsText] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodShortDesc, setProdShortDesc] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodFeatured, setProdFeatured] = useState(true);
  const [prodIsNew, setProdIsNew] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Importação em Massa (Lista / Planilha)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [importingBulk, setImportingBulk] = useState(false);

  // Configurações das 3 APIs da Sicredi no Painel Admin
  const [sicrediEnv, setSicrediEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [pixChave, setPixChave] = useState('financeiro@espacocatolicosantoantonio.com.br');
  const [pixClientId, setPixClientId] = useState('');
  const [pixClientSecret, setPixClientSecret] = useState('');
  const [cooperativa, setCooperativa] = useState('0101');
  const [posto, setPosto] = useState('02');
  const [codigoBeneficiario, setCodigoBeneficiario] = useState('12345');
  const [cobrancaApiKey, setCobrancaApiKey] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [ecommerceMerchantId, setEcommerceMerchantId] = useState('');
  const [ecommerceMerchantKey, setEcommerceMerchantKey] = useState('');
  const [savedSicrediMsg, setSavedSicrediMsg] = useState<string | null>(null);

  // Simulador de Teste Rápido Sicredi no Painel Admin
  const [testResult, setTestResult] = useState<SicrediPaymentResponse | null>(null);
  const [testingMethod, setTestingMethod] = useState(false);

  useEffect(() => {
    setProductsList(demoStore.getProducts());

    const handleCatalogUpdate = () => {
      setProductsList(demoStore.getProducts());
    };
    window.addEventListener(CATALOG_UPDATED_EVENT, handleCatalogUpdate);

    // Sincroniza catálogo salvo na nuvem Firebase Cloud Firestore
    setSyncingCloud(true);
    demoStore
      .syncFromCloud()
      .then((list) => setProductsList(list))
      .finally(() => setSyncingCloud(false));

    try {
      const raw = localStorage.getItem(SICREDI_ADMIN_SETTINGS_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.sicrediEnv) setSicrediEnv(cfg.sicrediEnv);
        if (cfg.pixChave) setPixChave(cfg.pixChave);
        if (cfg.pixClientId) setPixClientId(cfg.pixClientId);
        if (cfg.cooperativa) setCooperativa(cfg.cooperativa);
        if (cfg.posto) setPosto(cfg.posto);
        if (cfg.codigoBeneficiario) setCodigoBeneficiario(cfg.codigoBeneficiario);
        if (cfg.ecommerceMerchantId) setEcommerceMerchantId(cfg.ecommerceMerchantId);
      }
    } catch {}

    return () => {
      window.removeEventListener(CATALOG_UPDATED_EVENT, handleCatalogUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center text-xs text-stone-500">
        Verificando credenciais de administrador...
      </div>
    );
  }

  // RBAC Security Gate: Restrict /admin to authenticated Admin accounts only
  if (!user || !isAdmin) {
    const handleUnlockAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      setPinError(null);
      const res = await elevateToAdmin(adminPinInput);
      if (!res.ok) {
        setPinError(res.error || 'Chave de Lojista inválida.');
      }
    };

    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="glass-card p-8 sm:p-10 rounded-3xl border border-[#7C5236]/30 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-[#EFE7DD] border border-[#7C5236]/30 text-[#3E2415] flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B4226]">
              Segurança RBAC Ativa
            </span>
            <h1 className="text-2xl font-serif font-bold text-[#3E2415] mt-1">
              Acesso Restrito ao Administrador
            </h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Esta área é exclusiva para cadastrar produtos e gerenciar a loja{' '}
              <strong>Santo Antônio</strong>.
            </p>
          </div>

          {!user ? (
            <div className="pt-2 space-y-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center bg-gradient-to-r from-[#6B4226] to-[#3E2415] text-white px-7 py-3.5 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-md"
              >
                Fazer Login como Administrador
              </Link>
              <p className="text-[11px] text-stone-500">
                Na tela de login, marque a opção <strong>&ldquo;Acesso Lojista / Admin&rdquo;</strong> e informe a chave <code className="bg-[#F3E9DC] px-1.5 py-0.5 rounded font-bold text-[#3E2415]">SANTOANTONIO2026</code>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleUnlockAdmin} className="space-y-3 text-left pt-2">
              <label className="block text-xs font-bold text-[#3E2415]">
                Digite a Chave de Segurança do Lojista para liberar seu acesso ({user.email}):
              </label>
              <input
                type="password"
                required
                placeholder="Digite SANTOANTONIO2026"
                value={adminPinInput}
                onChange={(e) => setAdminPinInput(e.target.value)}
                className="w-full bg-[#FAF5EE] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3 text-xs focus:outline-hidden focus:border-[#6B4226]"
              />
              {pinError && <p className="text-xs text-red-600 font-semibold">{pinError}</p>}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#6B4226] to-[#3E2415] text-white font-extrabold py-3.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
              >
                Validar Chave e Acessar Painel de Produtos
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const openNewProductForm = () => {
    setEditingProductId(null);
    setProdName('');
    setProdPrice('');
    setProdPromoPrice('');
    setProdCategory(categoriesList[0]?.slug || 'imagens-sacras');
    setProdStock('15');
    setProdMaterial('');
    setProdVariantsText('');
    setProdImageUrl('');
    setProdShortDesc('');
    setProdDesc('');
    setProdFeatured(true);
    setProdIsNew(true);
    setFormError(null);
    setShowProductModal(true);
  };

  const openEditProductForm = (p: Product) => {
    setEditingProductId(p.id);
    setProdName(p.name);
    setProdPrice(String(p.price));
    setProdPromoPrice(p.promo_price ? String(p.promo_price) : '');
    setProdCategory(p.category_slug || categoriesList[0]?.slug || 'imagens-sacras');
    setProdStock(String(p.stock ?? 10));
    setProdMaterial(p.material || '');
    setProdVariantsText(p.variants?.map((v) => v.name).join(', ') || '');
    setProdImageUrl(p.images?.[0] || '');
    setProdShortDesc(p.short_description || '');
    setProdDesc(p.description || '');
    setProdFeatured(Boolean(p.is_featured));
    setProdIsNew(Boolean(p.is_new));
    setFormError(null);
    setShowProductModal(true);
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    setUploadingPhoto(true);
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file, 520, 0.78);
      setProdImageUrl(compressedDataUrl);
    } catch (err: any) {
      setFormError(err?.message || 'Não foi possível carregar a foto selecionada.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!prodName.trim() || !prodPrice) {
      setFormError('Preencha o nome e o preço do produto.');
      return;
    }

    const parsedPrice = parseFloat(String(prodPrice).replace(',', '.'));
    if (Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Informe um preço válido maior que zero.');
      return;
    }

    let parsedPromo: number | null = null;
    if (prodPromoPrice.trim()) {
      const pPromo = parseFloat(String(prodPromoPrice).replace(',', '.'));
      if (!Number.isNaN(pPromo) && pPromo > 0 && pPromo < parsedPrice) {
        parsedPromo = pPromo;
      }
    }

    const cleanImg = prodImageUrl.trim();
    if (cleanImg && !/^https:\/\//i.test(cleanImg) && !/^data:image\//i.test(cleanImg)) {
      setFormError('Envie uma foto do seu computador/celular ou informe um link começando com https://');
      return;
    }

    const existingProd = editingProductId
      ? productsList.find((p) => p.id === editingProductId)
      : undefined;

    const baseSlug = prodName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const parsedStock = Math.max(0, parseInt(prodStock, 10) || 10);
    const variantNames = prodVariantsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const productToSave: Product = {
      id: existingProd ? existingProd.id : `custom-${Date.now()}`,
      name: prodName.trim(),
      slug: existingProd ? existingProd.slug : `${baseSlug}-${Date.now().toString().slice(-4)}`,
      price: parsedPrice,
      promo_price: parsedPromo,
      stock: parsedStock,
      short_description: prodShortDesc.trim() || prodDesc.trim().slice(0, 120),
      description: prodDesc.trim() || prodShortDesc.trim() || `${prodName.trim()} — artigo religioso selecionado com carinho pela loja Santo Antônio.`,
      category_slug: prodCategory,
      material: prodMaterial.trim() || undefined,
      variant_label: variantNames.length > 0 ? 'Opção / Tamanho' : existingProd?.variant_label || undefined,
      variants:
        variantNames.length > 0
          ? variantNames.map((vName, idx) => ({
              id: `var-${Date.now()}-${idx}`,
              name: vName,
              stock: parsedStock,
            }))
          : existingProd?.variants,
      images: cleanImg ? [cleanImg] : [],
      is_featured: prodFeatured,
      is_new: prodIsNew,
      is_demo: false,
      rating_avg: existingProd?.rating_avg || 5.0,
      rating_count: existingProd?.rating_count || 12,
      sales_count: existingProd?.sales_count || 15,
    };

    setSavingProduct(true);
    const updated = await demoStore.saveProduct(productToSave);
    setProductsList(updated);
    setSavingProduct(false);
    setShowProductModal(false);

    setFormFeedback(
      editingProductId
        ? `Produto "${productToSave.name}" atualizado e sincronizado na nuvem!`
        : `Produto "${productToSave.name}" cadastrado e sincronizado na nuvem! Já está visível para seu cliente.`
    );
    setTimeout(() => setFormFeedback(null), 5000);
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const toImport: Product[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(';').map((p) => p.trim());
      const name = parts[0];
      if (!name) return;
      const rawPrice = parseFloat((parts[1] || '49.90').replace('R$', '').replace(',', '.').trim());
      const price = Number.isNaN(rawPrice) || rawPrice <= 0 ? 49.9 : rawPrice;
      const catInput = (parts[2] || 'imagens-sacras').toLowerCase().trim();
      const matchedCat =
        categoriesList.find(
          (c) => c.slug === catInput || c.name.toLowerCase().includes(catInput)
        )?.slug || 'imagens-sacras';
      const stock = Math.max(1, parseInt(parts[3] || '15', 10) || 15);
      const material = parts[4] || undefined;
      const imageUrl = parts[5] && /^https:\/\//i.test(parts[5]) ? [parts[5]] : [];

      const slug = `${name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-3)}${idx}`;

      toImport.push({
        id: `custom-${Date.now()}-${idx}`,
        name,
        slug,
        price,
        stock,
        category_slug: matchedCat,
        material,
        description: `${name} — artigo religioso oficial da loja Santo Antônio.`,
        short_description: `${name}${material ? ` em ${material}` : ''}.`,
        images: imageUrl,
        is_featured: true,
        is_new: true,
        is_demo: false,
        rating_avg: 5,
        rating_count: 10,
      });
    });

    if (toImport.length === 0) return;

    setImportingBulk(true);
    const updated = await demoStore.bulkAddProducts(toImport);
    setProductsList(updated);
    setImportingBulk(false);
    setBulkText('');
    setShowBulkModal(false);
    setFormFeedback(
      `${toImport.length} produto(s) importado(s) e sincronizado(s) na nuvem com sucesso!`
    );
    setTimeout(() => setFormFeedback(null), 5000);
  };

  const handleManualCloudSync = async () => {
    setSyncingCloud(true);
    const updated = await demoStore.syncFromCloud();
    setProductsList(updated);
    setSyncingCloud(false);
    setFormFeedback('Catálogo sincronizado com o banco Firebase Cloud Firestore!');
    setTimeout(() => setFormFeedback(null), 3500);
  };

  const handleSaveSicrediConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        SICREDI_ADMIN_SETTINGS_KEY,
        JSON.stringify({
          sicrediEnv,
          pixChave,
          pixClientId,
          cooperativa,
          posto,
          codigoBeneficiario,
          ecommerceMerchantId,
        })
      );
      setSavedSicrediMsg(
        'Configurações públicas da API Sicredi (Banco 748) salvas! Chaves secretas de produção devem ser definidas nas variáveis de ambiente da Vercel.'
      );
      setTimeout(() => setSavedSicrediMsg(null), 5000);
    } catch {}
  };

  const handleTestSicrediApi = async (method: SicrediPaymentMethod) => {
    setTestingMethod(true);
    const res = await createSicrediPayment({
      orderNumber: `TESTE-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: 149.9,
      method,
      customer: {
        name: 'Cliente Teste Sicredi',
        email: 'teste@espacocatolicosantoantonio.com.br',
        cpfCnpj: '123.456.789-00',
        phone: '(31) 99999-0000',
        address: {
          cep: '30140-071',
          street: 'Av. Brasil',
          number: '1000',
          district: 'Funcionários',
          city: 'Belo Horizonte',
          state: 'MG',
        },
      },
      card:
        method === 'credit_card' || method === 'debit_card'
          ? {
              holderName: 'CLIENTE TESTE SICREDI',
              number: '6042017480001234',
              expiryMonth: '12',
              expiryYear: '30',
              cvv: '748',
              installments: method === 'debit_card' ? 1 : 3,
            }
          : undefined,
    });
    setTestResult(res);
    setTestingMethod(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto do catálogo?')) {
      const updated = demoStore.deleteProduct(id);
      setProductsList(updated);
      setFormFeedback('Produto removido e catálogo sincronizado na nuvem.');
      setTimeout(() => setFormFeedback(null), 3500);
    }
  };

  const removeDemoProducts = () => {
    if (
      confirm(
        'Deseja ocultar todos os produtos de exemplo para deixar apenas os produtos reais que você cadastrar para o cliente?'
      )
    ) {
      const updated = demoStore.removeDemoProducts();
      setProductsList(updated);
      setFormFeedback(
        'Produtos de exemplo removidos! Agora apenas os produtos cadastrados por você aparecerão na loja.'
      );
      setTimeout(() => setFormFeedback(null), 5000);
    }
  };

  const restoreCatalog = () => {
    const updated = demoStore.restoreDemoProducts();
    setProductsList(updated);
    setFormFeedback('Catálogo padrão de demonstração restaurado!');
    setTimeout(() => setFormFeedback(null), 4000);
  };

  const filteredAdminProducts = productsList.filter((p) => {
    const matchesCat =
      adminCategoryFilter === 'all' || p.category_slug === adminCategoryFilter;
    const matchesQuery =
      !adminSearch.trim() ||
      p.name.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (p.category_slug || '').toLowerCase().includes(adminSearch.toLowerCase()) ||
      (p.material || '').toLowerCase().includes(adminSearch.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const inputClass =
    'w-full bg-[#FAF5EE] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-2.5 text-xs focus:outline-hidden focus:border-[#6B4226]';

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Cabeçalho do Painel Admin */}
      <div className="glass-card rounded-2xl p-6 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-[#7C5236]/25">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold tracking-[0.28em] text-[#6B4226] uppercase flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#7C5236]" /> Painel do Lojista • Santo Antônio
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F3E9DC] border border-[#C8A98E] text-[10px] font-bold text-[#3E2415]">
              <Cloud className="w-3 h-3 text-[#6B4226]" />
              {syncingCloud
                ? 'Sincronizando com a Nuvem...'
                : 'Sincronizado na Nuvem (Visível p/ Cliente)'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-serif font-bold text-sacred-shimmer mt-1">
            Gestão de Produtos e Pagamentos
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { id: 'products', label: `📦 Produtos (${productsList.length})` },
            { id: 'dashboard', label: 'Visão Geral' },
            { id: 'sicredi', label: 'Pagamentos Sicredi (748)' },
            { id: 'categories', label: 'Categorias' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                tab === t.id
                  ? 'bg-gradient-to-r from-[#6B4226] to-[#3E2415] text-white shadow-sm'
                  : 'bg-[#FAF5EE] border border-[#7C5236]/25 text-[#3E2415] hover:bg-[#F3E9DC]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {formFeedback && (
        <div className="mb-6 p-4 rounded-2xl bg-[#F3E9DC] border-2 border-[#6B4226] text-[#3E2415] text-xs font-bold flex items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#6B4226] shrink-0" />
            <span>{formFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFormFeedback(null)}
            className="text-stone-500 hover:text-[#3E2415] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          ABA 1: GERENCIADOR COMPLETO DE PRODUTOS (COM UPLOAD DE FOTO E NUVEM)
      ===================================================================== */}
      {tab === 'products' && (
        <div className="space-y-6">
          {/* Barra de Ações Rápidas para Cadastrar Produtos para o Cliente */}
          <div className="glass-card p-5 sm:p-6 rounded-2xl border border-[#7C5236]/25 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-serif font-bold text-lg sm:text-xl text-[#3E2415]">
                Catálogo de Produtos da Loja ({productsList.length} itens)
              </h2>
              <p className="text-xs text-stone-600">
                Tudo o que você cadastrar, editar ou enviar foto aqui fica salvo automaticamente na{' '}
                <strong>Nuvem (Firebase Cloud Firestore)</strong> e aparece na hora no celular ou
                computador do seu cliente.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={openNewProductForm}
                className="bg-gradient-to-r from-[#6B4226] to-[#3E2415] hover:brightness-110 text-white text-xs font-extrabold px-5 py-3 rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" /> Cadastrar Novo Produto
              </button>

              <button
                type="button"
                onClick={() => setShowBulkModal(!showBulkModal)}
                className="bg-[#F3E9DC] hover:bg-[#E6D2B5] text-[#3E2415] border border-[#7C5236]/30 text-xs font-bold px-4 py-3 rounded-xl flex items-center gap-2 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#6B4226]" /> Importar Vários de Uma Vez
              </button>

              <button
                type="button"
                onClick={handleManualCloudSync}
                disabled={syncingCloud}
                className="bg-[#FAF5EE] hover:bg-[#F3E9DC] text-[#6B4226] border border-[#7C5236]/25 text-xs font-bold px-3.5 py-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                title="Atualizar catálogo com a nuvem"
              >
                <Cloud className="w-4 h-4" />
                <span>{syncingCloud ? 'Sincronizando...' : 'Sincronizar Nuvem'}</span>
              </button>
            </div>
          </div>

          {/* Modal / Painel de Cadastro ou Edição de Produto (com Upload de Foto) */}
          {showProductModal && (
            <form
              onSubmit={handleSaveProduct}
              className="glass-card p-6 sm:p-8 rounded-3xl border-2 border-[#6B4226] space-y-5 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-[#7C5236]/20 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B4226]">
                    {editingProductId ? 'Editando Produto Existente' : 'Novo Produto na Nuvem'}
                  </span>
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-[#3E2415]">
                    {editingProductId
                      ? `Editar: ${prodName}`
                      : 'Cadastrar Produto para o Cliente'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="p-2 rounded-full hover:bg-[#F3E9DC] text-stone-500 hover:text-[#3E2415] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Coluna 1: Foto do Produto (Upload do PC/Celular ou Link) */}
                <div className="lg:col-span-1 space-y-3">
                  <label className="block text-xs font-bold text-[#3E2415]">
                    Foto do Produto (Do Computador/Celular ou Link)
                  </label>

                  <div className="aspect-square rounded-2xl border-2 border-dashed border-[#C8A98E] bg-[#FAF5EE] flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
                    {prodImageUrl ? (
                      <>
                        <img
                          src={prodImageUrl}
                          alt="Prévia do Produto"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setProdImageUrl('')}
                          className="absolute top-3 right-3 bg-[#3E2415]/90 text-white text-[11px] font-bold px-3 py-1 rounded-full hover:bg-red-700 transition cursor-pointer"
                        >
                          Remover Foto
                        </button>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-14 h-14 rounded-full bg-[#F3E9DC] text-[#6B4226] flex items-center justify-center mx-auto">
                          <ImageIcon className="w-7 h-7" />
                        </div>
                        <p className="text-xs font-bold text-[#3E2415]">
                          Nenhuma foto selecionada
                        </p>
                        <p className="text-[11px] text-stone-500 max-w-[200px]">
                          Envie uma foto direto do seu computador ou celular abaixo
                        </p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    disabled={uploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-[#F3E9DC] hover:bg-[#E6D2B5] text-[#3E2415] border border-[#7C5236]/30 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-[#6B4226]" />
                    {uploadingPhoto
                      ? 'Otimizando Foto...'
                      : 'Enviar Foto do Computador / Celular'}
                  </button>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Ou cole o link HTTPS da imagem (opcional):
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      value={prodImageUrl.startsWith('data:') ? '' : prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Colunas 2 e 3: Dados do Produto */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Nome do Produto *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Imagem de Santo Antônio 30cm em Resina"
                        value={prodName}
                        onChange={(e) => setProdName(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Preço de Venda (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="Ex: 129.90"
                        value={prodPrice}
                        onChange={(e) => setProdPrice(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Preço Promocional / Oferta (R$ - Opcional)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 99.90 (deixe vazio se não estiver em oferta)"
                        value={prodPromoPrice}
                        onChange={(e) => setProdPromoPrice(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Categoria na Loja *
                      </label>
                      <select
                        value={prodCategory}
                        onChange={(e) => setProdCategory(e.target.value)}
                        className={inputClass}
                      >
                        {categoriesList.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.parent_id ? `↳ ${c.name}` : `✦ ${c.name}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Quantidade em Estoque *
                      </label>
                      <input
                        type="number"
                        required
                        value={prodStock}
                        onChange={(e) => setProdStock(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Material / Acabamento (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Madeira Nobre, Resina, Banhado a Ouro"
                        value={prodMaterial}
                        onChange={(e) => setProdMaterial(e.target.value)}
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3E2415] mb-1">
                        Opções ou Tamanhos (separados por vírgula)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 20cm, 30cm, 40cm (ou P, M, G)"
                        value={prodVariantsText}
                        onChange={(e) => setProdVariantsText(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3E2415] mb-1">
                      Resumo Curto (aparece abaixo do título)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Escultura sacra pintada à mão com riqueza de detalhes."
                      value={prodShortDesc}
                      onChange={(e) => setProdShortDesc(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3E2415] mb-1">
                      Descrição Completa do Produto
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Descreva os detalhes, dimensões, história devocional e acabamento da peça..."
                      value={prodDesc}
                      onChange={(e) => setProdDesc(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 text-xs font-bold text-[#3E2415] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prodFeatured}
                        onChange={(e) => setProdFeatured(e.target.checked)}
                        className="accent-[#6B4226] w-4 h-4 rounded"
                      />
                      <span>Destacar na Vitrine da Página Inicial</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-[#3E2415] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={prodIsNew}
                        onChange={(e) => setProdIsNew(e.target.checked)}
                        className="accent-[#6B4226] w-4 h-4 rounded"
                      />
                      <span>Exibir Selo &ldquo;Novo / Lançamento&rdquo;</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-[#7C5236]/15">
                    <button
                      type="button"
                      onClick={() => setShowProductModal(false)}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-stone-600 hover:bg-[#EFE7DD] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingProduct}
                      className="bg-gradient-to-r from-[#6B4226] to-[#3E2415] hover:brightness-110 text-white font-extrabold px-7 py-3 rounded-xl text-xs uppercase tracking-wider shadow-md cursor-pointer"
                    >
                      {savingProduct
                        ? 'Salvando na Nuvem...'
                        : editingProductId
                        ? 'Salvar Alterações na Nuvem'
                        : 'Publicar Produto na Loja'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Modal / Painel de Importação Rápida em Lote */}
          {showBulkModal && (
            <form
              onSubmit={handleBulkImport}
              className="glass-card p-6 rounded-3xl border-2 border-[#6B4226] space-y-4 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B4226]">
                    Cadastro Rápido em Massa
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#3E2415]">
                    Importar Lista de Produtos de Uma Só Vez
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="p-1.5 text-stone-500 hover:text-[#3E2415] cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                Cole um produto por linha separando por ponto e vírgula (<code>;</code>) no
                formato:{' '}
                <strong className="text-[#3E2415]">
                  Nome do Produto; Preço; Categoria; Estoque; Material
                </strong>
              </p>

              <textarea
                rows={6}
                required
                placeholder={`Imagem de Santo Antônio 30cm; 149,90; imagens-sacras; 12; Resina Importada\nTerço de Madeira São Bento; 34,90; tercos-e-rosarios; 40; Madeira Imbuia\nBíblia Sagrada Ave Maria Capa Couro; 89,90; biblias-e-livros; 20; Couro Legítimo`}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full bg-[#FAF5EE] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl p-3.5 text-xs font-mono focus:outline-hidden focus:border-[#6B4226]"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-500 hover:text-[#3E2415] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={importingBulk}
                  className="bg-gradient-to-r from-[#6B4226] to-[#3E2415] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  {importingBulk
                    ? 'Importando para a Nuvem...'
                    : 'Importar Todos os Produtos'}
                </button>
              </div>
            </form>
          )}

          {/* Barra de Busca, Filtro por Categoria e Limpeza de Exemplos */}
          <div className="glass-card p-4 rounded-2xl border border-[#7C5236]/25 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Buscar produto por nome ou material..."
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  className="w-full bg-[#FAF5EE] border border-[#7C5236]/30 text-[#2C1A10] rounded-xl py-2 pl-3.5 pr-9 text-xs focus:outline-hidden focus:border-[#6B4226]"
                />
                <Search className="w-4 h-4 text-[#6B4226] absolute right-3 top-2.5" />
              </div>

              <select
                value={adminCategoryFilter}
                onChange={(e) => setAdminCategoryFilter(e.target.value)}
                className="w-full sm:w-56 bg-[#FAF5EE] border border-[#7C5236]/30 text-[#3E2415] rounded-xl py-2 px-3 text-xs font-bold focus:outline-hidden"
              >
                <option value="all">Todas as Categorias ({productsList.length})</option>
                {categoriesList.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={removeDemoProducts}
                className="px-3.5 py-2 rounded-xl bg-[#FAF5EE] hover:bg-red-50 text-[#3E2415] hover:text-red-700 border border-[#7C5236]/25 text-[11px] font-bold transition cursor-pointer"
              >
                Limpar Produtos de Exemplo
              </button>
              <button
                type="button"
                onClick={restoreCatalog}
                className="px-3.5 py-2 rounded-xl bg-[#FAF5EE] hover:bg-[#F3E9DC] text-[#6B4226] border border-[#7C5236]/25 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar Exemplos
              </button>
            </div>
          </div>

          {/* Tabela de Produtos com Miniatura, Edição Rápida e Exclusão */}
          <div className="glass-card rounded-2xl border border-[#7C5236]/25 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-[#EFE7DD] uppercase font-bold text-[#3E2415] border-b border-[#7C5236]/20">
                  <tr>
                    <th className="p-4">Foto</th>
                    <th className="p-4">Produto</th>
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Preço</th>
                    <th className="p-4">Estoque</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#7C5236]/15">
                  {filteredAdminProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF5EE]/80">
                      <td className="p-3">
                        <div className="w-12 h-12 rounded-xl bg-[#F3E9DC] border border-[#C8A98E] overflow-hidden flex items-center justify-center shrink-0">
                          {p.images && p.images.length > 0 ? (
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => openEditProductForm(p)}
                              className="text-[9px] font-bold text-[#6B4226] text-center leading-tight px-1 hover:underline cursor-pointer"
                              title="Clique para enviar foto"
                            >
                              + Foto
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-[#2C1A10]">{p.name}</div>
                        {p.material && (
                          <span className="text-[11px] text-stone-500 block">{p.material}</span>
                        )}
                      </td>
                      <td className="p-4 text-stone-600">{p.category_slug}</td>
                      <td className="p-4">
                        {p.promo_price && p.promo_price < p.price ? (
                          <div>
                            <span className="text-[10px] text-stone-400 line-through block">
                              R$ {p.price.toFixed(2).replace('.', ',')}
                            </span>
                            <strong className="text-[#6B4226] font-extrabold">
                              R$ {p.promo_price.toFixed(2).replace('.', ',')}
                            </strong>
                          </div>
                        ) : (
                          <strong className="text-[#3E2415] font-bold">
                            R$ {p.price.toFixed(2).replace('.', ',')}
                          </strong>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold ${
                            p.stock < 5
                              ? 'bg-[#EFE7DD] text-[#3E2415] border border-[#7C5236]/30'
                              : 'bg-[#F3E9DC] text-[#3E2415] border border-[#6B4226]/30'
                          }`}
                        >
                          {p.stock} un.
                        </span>
                      </td>
                      <td className="p-4">
                        {!p.is_demo ? (
                          <span className="text-[10px] bg-[#6B4226] text-[#F3E9DC] font-bold px-2.5 py-0.5 rounded-full">
                            ✦ Produto Oficial
                          </span>
                        ) : (
                          <span className="text-[10px] bg-[#FAF5EE] text-[#7C5236] font-semibold px-2.5 py-0.5 rounded-full border border-[#7C5236]/25">
                            Exemplo
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditProductForm(p)}
                            className="px-3 py-1.5 rounded-lg bg-[#F3E9DC] hover:bg-[#6B4226] text-[#3E2415] hover:text-white font-bold text-[11px] inline-flex items-center gap-1 transition cursor-pointer"
                            title="Editar produto ou adicionar foto"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Editar / Foto
                          </button>
                          <Link
                            href={`/produto/${p.slug}`}
                            className="p-1.5 rounded-lg text-stone-500 hover:text-[#3E2415] hover:bg-[#F3E9DC] transition"
                            title="Ver página do produto"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            title="Excluir produto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Faturamento no Período</span>
              <div className="text-3xl font-extrabold text-[#3E2415] mt-1">R$ 14.890,50</div>
              <span className="text-[11px] text-[#6B4226] font-bold mt-2 block">
                ✦ Liquidado via Sicredi 748
              </span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Pedidos Realizados</span>
              <div className="text-3xl font-extrabold text-[#3E2415] mt-1">84</div>
              <span className="text-[11px] text-stone-500 mt-2 block">12 aguardando pagamento</span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Artigos no Catálogo</span>
              <div className="text-3xl font-extrabold text-[#3E2415] mt-1">
                {productsList.length}
              </div>
              <span className="text-[11px] text-[#7C5236] font-bold mt-2 block">
                Sincronizados com Firebase Cloud
              </span>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-[#7C5236]/25">
              <span className="text-xs text-stone-500 font-medium">Gateway Ativo</span>
              <div className="text-2xl font-extrabold text-[#6B4226] mt-1 flex items-center gap-1.5">
                <Building2 className="w-6 h-6" /> SICREDI 748
              </div>
              <span className="text-[11px] text-[#6B4226] font-bold mt-2 block">
                PIX • Crédito/Débito • Boleto
              </span>
            </div>
          </div>

          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25">
            <h3 className="font-serif font-bold text-lg text-[#3E2415] mb-4">
              Ações Rápidas do Administrador
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setTab('products');
                  openNewProductForm();
                }}
                className="bg-gradient-to-r from-[#6B4226] to-[#3E2415] text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" /> Cadastrar Novo Produto
              </button>
              <button
                onClick={() => setTab('sicredi')}
                className="bg-[#6B4226] hover:bg-[#3E2415] text-white font-extrabold px-5 py-3 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Building2 className="w-4 h-4" /> Configurar API Sicredi (PIX / Cartão / Boleto)
              </button>
              <button
                onClick={removeDemoProducts}
                className="bg-[#FAF5EE] hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-[#3E2415] font-semibold px-5 py-3 rounded-xl text-xs transition border border-[#7C5236]/25 cursor-pointer"
              >
                Remover Produtos de Demonstração
              </button>
              <button
                onClick={restoreCatalog}
                className="bg-[#FAF5EE] hover:bg-[#F3E9DC] text-[#6B4226] font-semibold px-5 py-3 rounded-xl text-xs transition border border-[#6B4226]/30 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar Catálogo Padrão
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'sicredi' && (
        <div className="space-y-8">
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#7C5236]/15 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6B4226] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Portal do Desenvolvedor Sicredi (Banco 748)
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#3E2415] mt-0.5">
                  Configuração das APIs de Pagamento Sicredi
                </h2>
              </div>
              <span className="px-3.5 py-1.5 rounded-full bg-[#F3E9DC] border border-[#6B4226]/30 text-xs font-bold text-[#3E2415] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#6B4226]" />
                Modo Atual: {sicrediEnv === 'production' ? 'Produção Sicredi' : 'Sandbox / Homologação'}
              </span>
            </div>

            {savedSicrediMsg && (
              <div className="p-4 rounded-xl bg-[#F3E9DC] border border-[#6B4226] text-[#3E2415] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#6B4226]" />
                <span>{savedSicrediMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSicrediConfig} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#3E2415] mb-1">
                    Ambiente da Integração
                  </label>
                  <select
                    value={sicrediEnv}
                    onChange={(e) => setSicrediEnv(e.target.value as 'sandbox' | 'production')}
                    className={inputClass}
                  >
                    <option value="sandbox">Sandbox / Homologação (Simulação Ativa)</option>
                    <option value="production">Produção (API Oficial Sicredi)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#3E2415] mb-1">
                    Chave PIX Sicredi Recebedora (CNPJ, E-mail, Telefone ou EVP)
                  </label>
                  <input
                    type="text"
                    value={pixChave}
                    onChange={(e) => setPixChave(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* 1. API Pix Sicredi */}
              <div className="p-5 rounded-2xl bg-[#FAF5EE] border border-[#7C5236]/20 space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#3E2415] flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#6B4226]" /> 1. API Pix Sicredi (Padrão BACEN —
                  Cobrança Imediata & Webhook)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Client ID (SICREDI_PIX_CLIENT_ID)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: cli_sicredi_pix_..."
                      value={pixClientId}
                      onChange={(e) => setPixClientId(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Client Secret (SICREDI_PIX_CLIENT_SECRET)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••"
                      value={pixClientSecret}
                      onChange={(e) => setPixClientSecret(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* 2. API de Cobrança / Boleto Híbrido Sicredi */}
              <div className="p-5 rounded-2xl bg-[#FAF5EE] border border-[#7C5236]/20 space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#3E2415] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#6B4226]" /> 2. API de Cobrança / Boleto
                  Híbrido Sicredi (Banco 748)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Cooperativa (4 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={cooperativa}
                      onChange={(e) => setCooperativa(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Posto / Agência (2 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={2}
                      value={posto}
                      onChange={(e) => setPosto(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Código do Beneficiário (5 dígitos)
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={codigoBeneficiario}
                      onChange={(e) => setCodigoBeneficiario(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Token x-api-key (Portal Developer)
                    </label>
                    <input
                      type="password"
                      placeholder="x-api-key da Cobrança"
                      value={cobrancaApiKey}
                      onChange={(e) => setCobrancaApiKey(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Código de Acesso (Gerado no Internet Banking Sicredi)
                    </label>
                    <input
                      type="password"
                      placeholder="Código de Acesso da API Cobrança"
                      value={codigoAcesso}
                      onChange={(e) => setCodigoAcesso(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* 3. API Cartão Crédito / Débito Sicredi */}
              <div className="p-5 rounded-2xl bg-[#FAF5EE] border border-[#7C5236]/20 space-y-4">
                <h3 className="font-serif font-bold text-sm text-[#3E2415] flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#6B4226]" /> 3. API E-commerce Cartão de
                  Crédito e Débito (Sicredi Pagamentos)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Merchant ID (Estabelecimento Sicredi)
                    </label>
                    <input
                      type="text"
                      placeholder="ID do Estabelecimento"
                      value={ecommerceMerchantId}
                      onChange={(e) => setEcommerceMerchantId(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Merchant Key (Chave E-commerce Sicredi)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••••••"
                      value={ecommerceMerchantKey}
                      onChange={(e) => setEcommerceMerchantKey(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-[#6B4226] to-[#3E2415] text-white font-extrabold px-6 py-3 rounded-xl text-xs uppercase tracking-wider shadow-sm cursor-pointer"
                >
                  Salvar Credenciais Sicredi
                </button>
              </div>
            </form>
          </div>

          {/* Simulador de Teste Rápido da Integração Sicredi */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25 space-y-5">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#3E2415]">
                Simulador e Teste de Emissão Sicredi (Sandbox)
              </h3>
              <p className="text-xs text-stone-600 mt-0.5">
                Clique em uma das modalidades abaixo para testar a geração de cobrança (R$ 149,90) e
                visualizar o retorno real da integração:
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('pix')}
                className="bg-[#6B4226] hover:bg-[#3E2415] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <QrCode className="w-4 h-4" /> Testar PIX Dinâmico Sicredi
              </button>
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('boleto')}
                className="bg-[#3E2415] hover:bg-[#2C1A10] text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <FileText className="w-4 h-4" /> Testar Boleto Híbrido 748
              </button>
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('credit_card')}
                className="bg-[#FAF5EE] hover:bg-[#F3E9DC] text-[#3E2415] border border-[#6B4226]/40 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <CreditCard className="w-4 h-4" /> Testar Cartão de Crédito (3x)
              </button>
              <button
                type="button"
                disabled={testingMethod}
                onClick={() => handleTestSicrediApi('debit_card')}
                className="bg-[#FAF5EE] hover:bg-[#F3E9DC] text-[#3E2415] border border-[#6B4226]/40 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition"
              >
                <CreditCard className="w-4 h-4" /> Testar Cartão de Débito
              </button>
            </div>

            {testResult && (
              <div className="pt-3">
                <SicrediPaymentResultCard
                  orderNumber={testResult.orderNumber}
                  total={testResult.amount}
                  customerName="Cliente Teste Sicredi"
                  customerCpf="123.456.789-00"
                  customerAddress="Av. Brasil, 1000 - Funcionários, Belo Horizonte/MG"
                  paymentMethod={testResult.method}
                  sicrediData={{
                    mode: testResult.mode,
                    pix: testResult.pix,
                    boleto: testResult.boleto,
                    cardTransaction: testResult.cardTransaction,
                  }}
                  orderStatus={testResult.orderStatus}
                  onSimulatePaid={() =>
                    setTestResult({ ...testResult, orderStatus: 'paid' })
                  }
                />
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-[#7C5236]/25">
          <h3 className="font-serif font-bold text-xl text-[#3E2415] mb-5">
            Estrutura de Categorias Cadastradas ({categoriesList.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categoriesList.map((c) => (
              <div
                key={c.slug}
                className="p-3.5 bg-[#FAF5EE] rounded-xl border border-[#7C5236]/25 flex justify-between items-center text-xs"
              >
                <div>
                  <span className="font-bold text-[#3E2415] block">{c.name}</span>
                  <span className="text-[#6B4226] text-[10px] font-mono">{c.slug}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
