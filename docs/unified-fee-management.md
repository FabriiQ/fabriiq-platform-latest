# Unified Fee Management System

## Overview

The Unified Fee Management System consolidates all fee-related configurations and operations into a single, streamlined interface. This system eliminates the confusion and redundancy of having multiple scattered settings pages and provides a coherent, efficient way to manage all fee operations.

## Key Features

### 🎯 **Unified Configuration**
- Single source of truth for all fee settings
- Consolidated interface with clear sections
- No more duplicate or conflicting settings
- Real-time validation and preview

### 💰 **Advanced Late Fee Management**
- Multiple calculation types (Fixed, Percentage, Daily, Tiered)
- Compounding interest support
- Grace period configuration
- Automated processing with dry-run capability
- Comprehensive waiver management

### 🧾 **Receipt Management**
- Customizable receipt templates
- Multiple delivery methods (Email, SMS, Download, Print)
- QR codes and barcodes support
- Flexible content configuration

### 🔔 **Notification System**
- Due date reminders
- Payment confirmations
- Overdue notifications
- Late fee alerts
- Multi-channel delivery (Email, SMS, Push, In-App)

### 📊 **Reporting & Analytics**
- Real-time dashboard data
- Configurable data retention
- Multiple export formats
- Performance optimization settings

## Architecture

### Core Components

1. **Unified Configuration Schema** (`src/types/fee-management-unified.ts`)
   - Comprehensive type definitions
   - Zod validation schemas
   - Hierarchical configuration structure

2. **Unified Service** (`src/server/api/services/unified-fee-management.service.ts`)
   - Centralized business logic
   - Configuration management
   - Late fee calculations
   - Data validation

3. **tRPC Router** (`src/server/api/routers/unified-fee-management.ts`)
   - API endpoints for all operations
   - Type-safe client-server communication
   - Comprehensive error handling

4. **React Components** (`src/components/admin/system/fee-management/`)
   - Main unified interface
   - Section-specific components
   - Real-time preview and validation

## Configuration Sections

### 1. General Settings
- **Currency Configuration**: Multi-region currency support
- **Due Date Rules**: Flexible due date calculations
- **Payment Methods**: Configure accepted payment types
- **Holiday Handling**: Weekend and holiday considerations

### 2. Late Fee Settings
- **Calculation Types**:
  - Fixed Amount: Simple flat fee
  - Percentage: Percentage of principal
  - Daily Percentage: Daily compounding rates
  - Tiered Rules: Complex rule-based calculations
- **Grace Periods**: Configurable grace periods
- **Automation**: Scheduled processing
- **Waivers**: Request and approval workflows

### 3. Receipt Settings
- **Templates**: Default, Minimal, Detailed, Custom
- **Features**: QR codes, barcodes, logos, signatures
- **Content**: Headers, footers, terms and conditions
- **Delivery**: Email, SMS, download, print options

### 4. Notification Settings
- **Due Date Reminders**: Multi-day reminder schedules
- **Payment Confirmations**: Instant payment notifications
- **Overdue Alerts**: Escalating overdue notifications
- **Late Fee Notifications**: Before and after application alerts

### 5. Reporting Settings
- **Data Retention**: Configurable retention periods
- **Dashboard**: Real-time data refresh settings
- **Exports**: Format and limit configurations
- **Performance**: Optimization settings

### 6. System Settings
- **Validation**: Strict mode and security rules
- **Integration**: Webhook and API configurations
- **Monitoring**: System status and health checks

## Migration from Legacy System

### Automatic Migration
The system includes an automatic migration script that:
- Identifies existing scattered settings
- Maps them to the unified structure
- Creates backups of original settings
- Validates the migration results

### Migration Script Usage
```bash
# Run migration script
npm run migrate-fee-settings

# Or use the API endpoint
POST /api/trpc/unifiedFeeManagement.migrateExistingSettings
{
  "dryRun": true,  // Set to false for actual migration
  "institutionId": "optional",
  "campusId": "optional"
}
```

### Manual Migration Steps
1. **Backup Current Settings**: Export existing configurations
2. **Run Migration Script**: Use the automated migration tool
3. **Validate Results**: Check all settings are correctly migrated
4. **Test Functionality**: Verify all features work as expected
5. **Update References**: Update any hardcoded references to old endpoints

## API Reference

### Configuration Management
```typescript
// Get complete configuration
const config = await api.unifiedFeeManagement.getConfiguration.query({
  institutionId?: string,
  campusId?: string
});

// Update configuration
const result = await api.unifiedFeeManagement.updateConfiguration.mutate({
  updates: Partial<UnifiedFeeConfig>,
  institutionId?: string,
  campusId?: string
});

// Get specific section
const section = await api.unifiedFeeManagement.getConfigurationSection.query({
  section: 'lateFees',
  institutionId?: string,
  campusId?: string
});
```

### Late Fee Calculations
```typescript
// Calculate late fee
const calculation = await api.unifiedFeeManagement.calculateLateFee.query({
  principalAmount: 1000,
  daysOverdue: 30,
  institutionId?: string,
  campusId?: string
});

// Preview multiple scenarios
const scenarios = await api.unifiedFeeManagement.previewLateFeeScenarios.query({
  principalAmount: 1000,
  scenarios: [
    { name: "1 Week", daysOverdue: 7 },
    { name: "1 Month", daysOverdue: 30 },
    { name: "3 Months", daysOverdue: 90 }
  ]
});
```

### Validation and Migration
```typescript
// Validate configuration
const validation = await api.unifiedFeeManagement.validateConfiguration.query(config);

// Migrate existing settings
const migration = await api.unifiedFeeManagement.migrateExistingSettings.mutate({
  dryRun: true,
  institutionId?: string,
  campusId?: string
});
```

## Usage Examples

### Setting Up Late Fees
```typescript
const lateFeeConfig = {
  enabled: true,
  gracePeriod: {
    days: 7,
    applyOnWeekends: false,
    applyOnHolidays: false
  },
  calculation: {
    type: 'DAILY_PERCENTAGE',
    dailyPercentageRate: 0.1, // 0.1% per day
    maxAmount: 500,
    compounding: {
      enabled: true,
      interval: 'DAILY',
      maxPeriods: 90,
      capAtPrincipal: true
    }
  },
  automation: {
    autoApply: true,
    processingSchedule: 'DAILY',
    processingTime: '02:00',
    dryRunFirst: true
  }
};

await api.unifiedFeeManagement.updateConfigurationSection.mutate({
  section: 'lateFees',
  updates: lateFeeConfig
});
```

### Configuring Notifications
```typescript
const notificationConfig = {
  enabled: true,
  dueDateReminders: {
    enabled: true,
    daysBefore: [7, 3, 1],
    channels: {
      email: true,
      sms: false,
      push: true,
      inApp: true
    }
  },
  lateFeeNotifications: {
    enabled: true,
    notifyBeforeApplication: true,
    daysBefore: 3,
    notifyAfterApplication: true,
    channels: {
      email: true,
      sms: true,
      push: false,
      inApp: true
    }
  }
};

await api.unifiedFeeManagement.updateConfigurationSection.mutate({
  section: 'notifications',
  updates: notificationConfig
});
```

## Testing

### Test Suite
The system includes a comprehensive test suite accessible at:
`/admin/system/fee-management/test`

### Test Coverage
- Configuration loading and validation
- Late fee calculations
- Migration functionality
- API response times
- Schema validation
- Integration testing

### Running Tests
```bash
# Run unit tests
npm test src/server/api/services/unified-fee-management.service.test.ts

# Run integration tests
npm test src/server/api/routers/unified-fee-management.test.ts

# Run end-to-end tests
npm run test:e2e -- --grep "unified fee management"
```

## Performance Considerations

### Optimization Features
- **Caching**: Configuration caching with TTL
- **Lazy Loading**: Section-based loading
- **Batch Operations**: Bulk configuration updates
- **Database Indexing**: Optimized queries

### Monitoring
- **Response Times**: API endpoint monitoring
- **Error Rates**: Error tracking and alerting
- **Usage Metrics**: Configuration access patterns
- **Performance Alerts**: Automated performance monitoring

## Security

### Access Control
- Role-based permissions for configuration sections
- Audit logging for all configuration changes
- Validation of all input data
- Rate limiting on API endpoints

### Data Protection
- Encryption of sensitive configuration data
- Secure backup and restore procedures
- GDPR compliance for notification data
- PCI compliance for payment-related settings

## Troubleshooting

### Common Issues
1. **Migration Failures**: Check existing data format compatibility
2. **Validation Errors**: Review configuration schema requirements
3. **Performance Issues**: Monitor database query performance
4. **Integration Problems**: Verify webhook and API configurations

### Debug Mode
Enable debug logging by setting:
```env
DEBUG_UNIFIED_FEE_MANAGEMENT=true
```

### Support
For technical support or questions:
- Check the test suite results
- Review the validation messages
- Consult the API documentation
- Contact the development team

## Future Enhancements

### Planned Features
- Multi-tenant configuration inheritance
- Advanced reporting dashboards
- Machine learning for fee optimization
- Integration with external payment gateways
- Mobile app configuration support

### Roadmap
- **Phase 1**: Core consolidation (Complete)
- **Phase 2**: Advanced analytics (Q2 2024)
- **Phase 3**: AI-powered insights (Q3 2024)
- **Phase 4**: Mobile optimization (Q4 2024)
