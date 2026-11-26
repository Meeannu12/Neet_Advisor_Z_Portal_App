import { Module } from '@nestjs/common';
import { AdminModule } from '@adminjs/nestjs';
import { DataSource } from 'typeorm';
import { buildAdminResources } from './admin-ui.helper.js';

@Module({
    imports: [
        AdminModule.createAdminAsync({
            inject: [DataSource],
            useFactory: async (dataSource: DataSource) => {
                const { default: AdminJS } = await import('adminjs');
                const { Database, Resource } = await import('@adminjs/typeorm');

                AdminJS.registerAdapter({ Database, Resource });

                const shouldBeInitialized =
                    process.env.NODE_ENV !== 'production' &&
                    process.env.ENABLE_ADMIN_UI !== 'false';

                return {
                    shouldBeInitialized,
                    adminJsOptions: {
                        rootPath: '/admin',
                        resources: shouldBeInitialized ? buildAdminResources(dataSource) : [],
                        branding: {
                            companyName: 'NEET Advisor Portal (Local DB)',
                            withMadeWithLove: false,
                        },
                    },
                };
            },
        }),
    ],
})
export class AdminUiModule {}
