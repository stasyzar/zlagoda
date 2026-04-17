/** Ролі в UI після логіну (див. AuthContext / ProtectedRoute). */
export type AppRole = 'Manager' | 'Cashier';

export interface Employee {
  id_employee: string;
  empl_surname: string;
  empl_name: string;
  empl_patronymic?: string;
  empl_role: 'manager' | 'cashier';
  salary: number;
  date_of_start: string;
  date_of_birth: string;
  phone_number: string;
  city: string;
  street: string;
  zip_code: string;
  check_count?: number;
}

export interface Category {
  category_number: number;
  category_name: string;
  product_count?: number;
}

export interface Product {
  id_product: number;
  category_number: number;
  product_name: string;
  producer: string;
  characteristics: string;
  store_product_count?: number;
  has_regular_store_product?: boolean;
  has_promotional_store_product?: boolean;
}

/** Повна відповідь менеджера за UPC / рядок списку (як StoreProductFullResponse на бекенді). */
export interface StoreProductFullResponse {
  upc: string;
  upc_prom?: string | null;
  id_product: number;
  selling_price: number;
  products_number: number;
  promotional_product: boolean;
  product_name?: string | null;
  characteristics?: string | null;
}

/** Рядок списку «товари у магазині» (бекенд серіалізує як StoreProductDetailsDto; поля збігаються з Full + sale_rows_count). */
export interface StoreProductListRow extends StoreProductFullResponse {
  sale_rows_count?: number;
}

/** Касир: лише UPC, ціна, кількість (GET /store-products/{upc}). */
export interface StoreProductCashierResponse {
  upc: string;
  selling_price: number;
  products_number: number;
}

/** Тіло створення/оновлення позиції у магазині (StoreProductRequest). */
export interface StoreProductRequestPayload {
  upc: string;
  id_product: number;
  selling_price?: number;
  products_number: number;
  promotional_product: boolean;
}

/** Сутність Store_Product після POST/PUT (модель без назви товару). */
export interface StoreProductEntity {
  upc: string;
  upc_prom?: string | null;
  id_product: number;
  selling_price: number;
  products_number: number;
  promotional_product: boolean;
}

/** @deprecated Використовуйте StoreProductListRow / StoreProductFullResponse / StoreProductCashierResponse. */
export type StoreProduct = StoreProductListRow;

export interface CustomerCard {
  card_number: string;
  cust_surname: string;
  cust_name: string;
  cust_patronymic?: string;
  phone_number: string;
  city?: string;
  street?: string;
  zip_code?: string;
  percent: number;
  check_count?: number;
}

export interface Check {
  check_number: string;
  id_employee: string;
  card_number?: string;
  print_date: string;
  sum_total: number;
  vat: number;
}

export interface CheckSaleItem {
  upc: string;
  product_name: string;
  quantity: number;
  selling_price: number;
}

/** GET /checks/{number} — CheckDetailsDto. */
export interface CheckDetails extends Check {
  items?: CheckSaleItem[];
}

export interface Sale {
  upc: string;
  check_number: string;
  product_number: number;
  selling_price: number;
}

export interface AuthUser {
  id_employee: string;
  role: AppRole;
  token: string;
}
