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
  /** Кількість товарів у каталозі (щоб знати, чи можна видалити категорію) */
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

export interface StoreProduct {
  upc: string;
  upc_prom?: string;
  id_product: number;
  selling_price: number;
  products_number: number;
  promotional_product: boolean;
  product_name?: string;
  characteristics?: string;
  /** Скільки разів цей UPC зустрічається в історії продажів */
  sale_rows_count?: number;
}

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
  /** Кількість чеків з цією карткою (щоб знати, чи можна видалити карту) */
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

export interface Sale {
  upc: string;
  check_number: string;
  product_number: number;
  selling_price: number;
}

// Для авторизації
export interface AuthUser {
  id_employee: string;
  role: 'Manager' | 'Cashier';
  token: string;
}
