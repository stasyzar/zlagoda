export interface Employee {
  id_employee: string;
  empl_surname: string;
  empl_name: string;
  empl_patronymic?: string;
  empl_role: 'Manager' | 'Cashier';
  salary: number;
  date_of_start: string;
  date_of_birth: string;
  phone_number: string;
  city: string;
  street: string;
  zip_code: string;
}

export interface Category {
  category_number: number;
  category_name: string;
}

export interface Product {
  id_product: number;
  category_number: number;
  product_name: string;
  characteristics: string;
}

export interface StoreProduct {
  UPC: string;
  UPC_prom?: string;
  id_product: number;
  selling_price: number;
  products_number: number;
  promotional_product: boolean;
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
  UPC: string;
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