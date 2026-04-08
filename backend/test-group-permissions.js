#!/usr/bin/env node

/**
 * Test Script for Group Permission System
 * This script tests the complete group permission functionality
 */

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
let authToken = '';
let testUserId = '';
let testGroupId = '';

// Test data
const testUser = {
    username: 'testuser_' + Date.now(),
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
    nombre_completo: 'Test User'
};

const testGroup = {
    name: 'Test Group ' + Date.now(),
    description: 'Group for testing permissions'
};

// Helper functions
async function request(method, endpoint, data = null, headers = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };

    if (authToken) {
        options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(url, options);
        const result = await response.json();
        return { status: response.status, data: result };
    } catch (error) {
        console.error(`Request failed: ${error.message}`);
        return { status: 500, data: { error: error.message } };
    }
}

async function step(name, fn) {
    console.log(`\n=== ${name} ===`);
    try {
        const result = await fn();
        console.log(`Status: ${result.status}`);
        console.log('Response:', JSON.stringify(result.data, null, 2));
        return result;
    } catch (error) {
        console.error(`Step failed: ${error.message}`);
        return { status: 500, data: { error: error.message } };
    }
}

// Test steps
async function testRegistration() {
    return await request('POST', '/api/auth/register', testUser);
}

async function testLogin() {
    const result = await request('POST', '/api/auth/login', {
        username: testUser.username,
        password: testUser.password
    });
    
    if (result.status === 200 && result.data.data && result.data.data[0]) {
        authToken = result.data.data[0].token;
        testUserId = result.data.data[0].user.id;
        console.log(`Auth token obtained: ${authToken.substring(0, 20)}...`);
    }
    
    return result;
}

async function testCreateGroup() {
    const result = await request('POST', '/api/groups', testGroup);
    
    if (result.status === 201 && result.data.data && result.data.data[0]) {
        testGroupId = result.data.data[0].id;
        console.log(`Group created with ID: ${testGroupId}`);
    }
    
    return result;
}

async function testGetPermissions() {
    return await request('GET', '/api/users/permissions');
}

async function testGetGroupPermissions() {
    const headers = { 'x-group-id': testGroupId };
    return await request('GET', '/api/users/permissions', null, headers);
}

async function testGetGroupDetails() {
    return await request('GET', `/api/groups/${testGroupId}`);
}

async function testUpdateMemberPermissions() {
    const permissions = ['ticket:view', 'ticket:add', 'group:view'];
    return await request('PUT', `/api/groups/${testGroupId}/members/${testUserId}/permissions`, {
        permissions
    });
}

async function testGetAvailablePermissions() {
    return await request('GET', `/api/groups/${testGroupId}/permissions`);
}

async function testPermissionValidation() {
    const headers = { 'x-group-id': testGroupId };
    return await request('GET', '/api/tickets', null, headers);
}

async function cleanup() {
    console.log('\n=== Cleanup ===');
    
    if (testGroupId) {
        await request('DELETE', `/api/groups/${testGroupId}`);
        console.log('Test group deleted');
    }
    
    if (testUserId) {
        await request('DELETE', `/api/users/${testUserId}`);
        console.log('Test user deleted');
    }
}

// Main test execution
async function runTests() {
    console.log('Starting Group Permission System Tests...\n');
    
    try {
        // Registration and Login
        await step('Register Test User', testRegistration);
        await step('Login Test User', testLogin);
        
        // Get initial permissions (should be empty or minimal)
        await step('Get Initial Permissions', testGetPermissions);
        
        // Create group
        await step('Create Test Group', testCreateGroup);
        
        // Get group permissions (should be different from global)
        await step('Get Group Permissions', testGetGroupPermissions);
        
        // Get group details
        await step('Get Group Details', testGetGroupDetails);
        
        // Update member permissions
        await step('Update Member Permissions', testUpdateMemberPermissions);
        
        // Get available permissions for group
        await step('Get Available Permissions', testGetAvailablePermissions);
        
        // Test permission validation (should work with new permissions)
        await step('Test Permission Validation', testPermissionValidation);
        
        console.log('\n=== Test Summary ===');
        console.log('All tests completed successfully!');
        console.log(`Test User ID: ${testUserId}`);
        console.log(`Test Group ID: ${testGroupId}`);
        
    } catch (error) {
        console.error('Test suite failed:', error);
    } finally {
        await cleanup();
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

module.exports = { runTests, request, step };
