import { describe, it, expect } from 'vitest';
import type {
  PlanFeatures,
  PlanFeatureKey,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest
} from './types';
import {
  FEATURE_CATEGORIES,
  FEATURE_CATEGORY_LABELS,
  DEFAULT_FEATURES
} from './types';

describe('plans/types', () => {
  describe('PlanFeatures interface', () => {
    const validFeatures: PlanFeatures = {
      clients: true,
      contracts: true,
      memberships: false,
      reports: true,
      appointments: false,
      attendanceControl: false,
      integrations: true,
      apiAccess: false,
      mobileAppAccess: true,
      billing: true,
      customBranding: false
    };

    it.each([
      'clients',
      'contracts',
      'memberships',
      'reports',
      'appointments',
      'attendanceControl',
      'integrations',
      'apiAccess',
      'mobileAppAccess',
      'billing',
      'customBranding'
    ])('has feature property: %s', (feature) => {
      expect(validFeatures).toHaveProperty(feature);
    });

    it('has 11 feature flags', () => {
      const featureKeys = Object.keys(validFeatures);
      expect(featureKeys).toHaveLength(11);
    });

    it('all feature values are booleans', () => {
      Object.values(validFeatures).forEach(value => {
        expect(typeof value).toBe('boolean');
      });
    });
  });

  describe('PlanFeatureKey type', () => {
    const validKeys: PlanFeatureKey[] = [
      'clients',
      'contracts',
      'memberships',
      'reports',
      'appointments',
      'attendanceControl',
      'integrations',
      'apiAccess',
      'mobileAppAccess',
      'billing',
      'customBranding'
    ];

    it.each(validKeys)('includes key: %s', (key) => {
      const features: PlanFeatures = DEFAULT_FEATURES;
      expect(key in features).toBe(true);
    });

    it('has 11 valid keys', () => {
      expect(validKeys).toHaveLength(11);
    });
  });

  describe('Plan interface', () => {
    const validPlan: Plan = {
      id: 'plan-001',
      code: 'BASIC',
      name: 'Basic Plan',
      description: 'Basic features for small businesses',
      monthlyPrice: 99.99,
      yearlyPrice: 999.99,
      isActive: true,
      features: {
        clients: true,
        contracts: true,
        memberships: false,
        reports: true,
        appointments: false,
        attendanceControl: false,
        integrations: false,
        apiAccess: false,
        mobileAppAccess: false,
        billing: true,
        customBranding: false
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      deletedAt: null
    };

    it('has all required properties', () => {
      const requiredProps = ['id', 'code', 'name', 'monthlyPrice', 'yearlyPrice', 'isActive', 'features', 'createdAt'];
      requiredProps.forEach(prop => {
        expect(validPlan).toHaveProperty(prop);
      });
    });

    it.each([
      { prop: 'id', type: 'string' },
      { prop: 'code', type: 'string' },
      { prop: 'name', type: 'string' },
      { prop: 'monthlyPrice', type: 'number' },
      { prop: 'yearlyPrice', type: 'number' },
      { prop: 'isActive', type: 'boolean' },
      { prop: 'createdAt', type: 'string' }
    ])('has property $prop of type $type', ({ prop, type }) => {
      expect(validPlan).toHaveProperty(prop);
      expect(typeof validPlan[prop as keyof Plan]).toBe(type);
    });

    it('supports optional description', () => {
      const minimalPlan: Plan = {
        id: 'plan-002',
        code: 'PREMIUM',
        name: 'Premium Plan',
        monthlyPrice: 299.99,
        yearlyPrice: 2999.99,
        isActive: true,
        features: DEFAULT_FEATURES,
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(minimalPlan.description).toBeUndefined();
      expect(minimalPlan.updatedAt).toBeUndefined();
      expect(minimalPlan.deletedAt).toBeUndefined();
    });

    it('deletedAt can be null for active plans', () => {
      expect(validPlan.deletedAt).toBeNull();
    });

    it('deletedAt can be a date string for deleted plans', () => {
      const deletedPlan: Plan = {
        ...validPlan,
        deletedAt: '2024-01-20T00:00:00Z'
      };

      expect(typeof deletedPlan.deletedAt).toBe('string');
    });

    it('features is a complete PlanFeatures object', () => {
      expect(validPlan.features).toHaveProperty('clients');
      expect(validPlan.features).toHaveProperty('contracts');
      expect(validPlan.features).toHaveProperty('billing');
    });
  });

  describe('CreatePlanRequest interface', () => {
    const validRequest: CreatePlanRequest = {
      name: 'New Plan',
      description: 'A new plan for testing',
      monthlyPrice: 49.99,
      yearlyPrice: 499.99,
      isActive: true,
      features: DEFAULT_FEATURES
    };

    it('has all required properties', () => {
      const requiredProps = ['name', 'monthlyPrice', 'yearlyPrice', 'isActive', 'features'];
      requiredProps.forEach(prop => {
        expect(validRequest).toHaveProperty(prop);
      });
    });

    it('supports optional description', () => {
      const withoutDescription: CreatePlanRequest = {
        name: 'Minimal Plan',
        monthlyPrice: 99.99,
        yearlyPrice: 999.99,
        isActive: true,
        features: DEFAULT_FEATURES
      };

      expect(withoutDescription.description).toBeUndefined();
    });

    it('features must be complete PlanFeatures object', () => {
      const request: CreatePlanRequest = {
        name: 'Test Plan',
        monthlyPrice: 99.99,
        yearlyPrice: 999.99,
        isActive: true,
        features: {
          clients: true,
          contracts: true,
          memberships: false,
          reports: true,
          appointments: false,
          attendanceControl: false,
          integrations: false,
          apiAccess: false,
          mobileAppAccess: false,
          billing: true,
          customBranding: false
        }
      };

      expect(request.features).toHaveProperty('clients');
      expect(request.features).toHaveProperty('customBranding');
    });
  });

  describe('UpdatePlanRequest interface', () => {
    const validRequest: UpdatePlanRequest = {
      name: 'Updated Plan',
      description: 'Updated description',
      monthlyPrice: 149.99,
      yearlyPrice: 1499.99,
      isActive: true,
      features: DEFAULT_FEATURES
    };

    it('has all required properties for update', () => {
      const requiredProps = ['name', 'monthlyPrice', 'yearlyPrice', 'isActive', 'features'];
      requiredProps.forEach(prop => {
        expect(validRequest).toHaveProperty(prop);
      });
    });

    it('allows all fields to be updated', () => {
      expect(validRequest.name).toBeDefined();
      expect(validRequest.monthlyPrice).toBeDefined();
      expect(validRequest.yearlyPrice).toBeDefined();
      expect(validRequest.isActive).toBeDefined();
      expect(validRequest.features).toBeDefined();
    });

    it('supports optional description', () => {
      const withoutDescription: UpdatePlanRequest = {
        name: 'Plan',
        monthlyPrice: 99.99,
        yearlyPrice: 999.99,
        isActive: true,
        features: DEFAULT_FEATURES
      };

      expect(withoutDescription.description).toBeUndefined();
    });
  });

  describe('FEATURE_CATEGORIES', () => {
    it('has 4 categories', () => {
      const categories = Object.keys(FEATURE_CATEGORIES);
      expect(categories).toHaveLength(4);
    });

    it.each(['gestion', 'operacion', 'tecnologia', 'negocio'])('includes category: %s', (category) => {
      expect(FEATURE_CATEGORIES).toHaveProperty(category);
    });

    it('gestion category has 3 features', () => {
      expect(FEATURE_CATEGORIES.gestion).toHaveLength(3);
    });

    it('operacion category has 3 features', () => {
      expect(FEATURE_CATEGORIES.operacion).toHaveLength(3);
    });

    it('tecnologia category has 3 features', () => {
      expect(FEATURE_CATEGORIES.tecnologia).toHaveLength(3);
    });

    it('negocio category has 2 features', () => {
      expect(FEATURE_CATEGORIES.negocio).toHaveLength(2);
    });

    it('all category features have key and label', () => {
      Object.values(FEATURE_CATEGORIES).forEach(features => {
        features.forEach(feature => {
          expect(feature).toHaveProperty('key');
          expect(feature).toHaveProperty('label');
          expect(typeof feature.key).toBe('string');
          expect(typeof feature.label).toBe('string');
        });
      });
    });

    it('gestion includes clients, contracts, memberships', () => {
      const gestKeys = FEATURE_CATEGORIES.gestion.map(f => f.key);
      expect(gestKeys).toContain('clients');
      expect(gestKeys).toContain('contracts');
      expect(gestKeys).toContain('memberships');
    });

    it('operacion includes reports, appointments, attendanceControl', () => {
      const opKeys = FEATURE_CATEGORIES.operacion.map(f => f.key);
      expect(opKeys).toContain('reports');
      expect(opKeys).toContain('appointments');
      expect(opKeys).toContain('attendanceControl');
    });

    it('tecnologia includes integrations, apiAccess, mobileAppAccess', () => {
      const techKeys = FEATURE_CATEGORIES.tecnologia.map(f => f.key);
      expect(techKeys).toContain('integrations');
      expect(techKeys).toContain('apiAccess');
      expect(techKeys).toContain('mobileAppAccess');
    });

    it('negocio includes billing, customBranding', () => {
      const bizKeys = FEATURE_CATEGORIES.negocio.map(f => f.key);
      expect(bizKeys).toContain('billing');
      expect(bizKeys).toContain('customBranding');
    });

    it('all feature keys are valid PlanFeatureKey', () => {
      Object.values(FEATURE_CATEGORIES).forEach(features => {
        features.forEach(feature => {
          expect(feature.key in DEFAULT_FEATURES).toBe(true);
        });
      });
    });
  });

  describe('FEATURE_CATEGORY_LABELS', () => {
    it('has 4 category labels', () => {
      const labels = Object.keys(FEATURE_CATEGORY_LABELS);
      expect(labels).toHaveLength(4);
    });

    it.each([
      { key: 'gestion', label: 'Gestión' },
      { key: 'operacion', label: 'Operación' },
      { key: 'tecnologia', label: 'Tecnología' },
      { key: 'negocio', label: 'Negocio' }
    ])('category $key has label: $label', ({ key, label }) => {
      expect(FEATURE_CATEGORY_LABELS[key]).toBe(label);
    });

    it('all labels are non-empty strings', () => {
      Object.values(FEATURE_CATEGORY_LABELS).forEach(label => {
        expect(typeof label).toBe('string');
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it('labels match categories in FEATURE_CATEGORIES', () => {
      Object.keys(FEATURE_CATEGORIES).forEach(category => {
        expect(FEATURE_CATEGORY_LABELS).toHaveProperty(category);
      });
    });
  });

  describe('DEFAULT_FEATURES', () => {
    it('has all 11 features', () => {
      expect(Object.keys(DEFAULT_FEATURES)).toHaveLength(11);
    });

    it.each([
      'clients',
      'contracts',
      'memberships',
      'reports',
      'appointments',
      'attendanceControl',
      'integrations',
      'apiAccess',
      'mobileAppAccess',
      'billing',
      'customBranding'
    ])('includes feature: %s', (feature) => {
      expect(DEFAULT_FEATURES).toHaveProperty(feature);
    });

    it('all default features are false', () => {
      Object.values(DEFAULT_FEATURES).forEach(value => {
        expect(value).toBe(false);
      });
    });

    it('is a valid PlanFeatures object', () => {
      const features: PlanFeatures = DEFAULT_FEATURES;
      expect(features).toEqual(DEFAULT_FEATURES);
    });

    it('can be used as base for creating plans', () => {
      const baseFeatures = { ...DEFAULT_FEATURES };
      baseFeatures.clients = true;
      baseFeatures.contracts = true;

      expect(baseFeatures.clients).toBe(true);
      expect(baseFeatures.contracts).toBe(true);
      expect(baseFeatures.memberships).toBe(false);
    });

    it('does not include any undefined features', () => {
      Object.values(DEFAULT_FEATURES).forEach(value => {
        expect(value).toBeDefined();
      });
    });
  });

  describe('Feature configuration scenarios', () => {
    it('creates a basic plan with minimal features', () => {
      const basicFeatures: PlanFeatures = {
        ...DEFAULT_FEATURES,
        clients: true,
        contracts: true,
        reports: true
      };

      expect(basicFeatures.clients).toBe(true);
      expect(basicFeatures.contracts).toBe(true);
      expect(basicFeatures.reports).toBe(true);
      expect(basicFeatures.integrations).toBe(false);
      expect(basicFeatures.apiAccess).toBe(false);
    });

    it('creates a professional plan with most features', () => {
      const proFeatures: PlanFeatures = {
        ...DEFAULT_FEATURES,
        clients: true,
        contracts: true,
        memberships: true,
        reports: true,
        appointments: true,
        attendanceControl: true,
        integrations: true,
        apiAccess: true,
        mobileAppAccess: true,
        billing: true,
        customBranding: false
      };

      const enabledCount = Object.values(proFeatures).filter(v => v === true).length;
      expect(enabledCount).toBe(10);
    });

    it('creates an enterprise plan with all features', () => {
      const enterpriseFeatures: PlanFeatures = {
        clients: true,
        contracts: true,
        memberships: true,
        reports: true,
        appointments: true,
        attendanceControl: true,
        integrations: true,
        apiAccess: true,
        mobileAppAccess: true,
        billing: true,
        customBranding: true
      };

      const enabledCount = Object.values(enterpriseFeatures).filter(v => v === true).length;
      expect(enabledCount).toBe(11);
    });
  });

  describe('Plan pricing scenarios', () => {
    it.each([
      { monthly: 9.99, yearly: 99.99, discount: '> 15%' },
      { monthly: 29.99, yearly: 299.99, discount: '= 0%' },
      { monthly: 99.99, yearly: 999.99, discount: '= 0%' },
      { monthly: 49.99, yearly: 499.99, discount: '= 0%' }
    ])('validates pricing: $monthly/month, $yearly/year', ({ monthly, yearly, discount }) => {
      const plan: Plan = {
        id: 'plan-test',
        code: 'TEST',
        name: 'Test Plan',
        monthlyPrice: monthly,
        yearlyPrice: yearly,
        isActive: true,
        features: DEFAULT_FEATURES,
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(plan.monthlyPrice).toBe(monthly);
      expect(plan.yearlyPrice).toBe(yearly);
      expect(plan.yearlyPrice).toBeGreaterThanOrEqual(plan.monthlyPrice * 10);
    });
  });
});
