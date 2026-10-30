import React from 'react';
import { Navigate } from 'react-router-dom';

const Orders = () => <Navigate to="/products?tab=orders" replace />;

export default Orders;
