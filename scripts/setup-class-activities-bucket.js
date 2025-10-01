/**
 * Setup script for class-activities Supabase storage bucket
 * This script creates the bucket and sets up proper policies for file uploads
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET_NAME = 'class-activities';

async function setupClassActivitiesBucket() {
  console.log('🚀 Setting up class-activities storage bucket...');

  try {
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const existingBucket = buckets.find(bucket => bucket.name === BUCKET_NAME);
    
    if (existingBucket) {
      console.log('✅ Bucket already exists:', BUCKET_NAME);
    } else {
      // Create the bucket
      const { data: bucket, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
        public: false,
        allowedMimeTypes: [
          'application/pdf',
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
          'video/mp4', 'video/webm',
          'text/plain',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        ],
        fileSizeLimit: 52428800 // 50MB
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }

      console.log('✅ Created bucket:', BUCKET_NAME);
    }

    // Set up RLS policies for the bucket
    console.log('🔐 Setting up RLS policies...');

    // Policy for teachers to upload files
    const teacherUploadPolicy = `
      CREATE POLICY "Teachers can upload class activity files" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = '${BUCKET_NAME}' AND
        auth.uid() IN (
          SELECT u.id FROM auth.users u
          JOIN public.users pu ON u.id = pu.id
          WHERE pu.user_type IN ('CAMPUS_TEACHER', 'SYSTEM_ADMIN', 'CAMPUS_ADMIN')
        )
      );
    `;

    // Policy for students to upload files (for submissions)
    const studentUploadPolicy = `
      CREATE POLICY "Students can upload activity submission files" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = '${BUCKET_NAME}' AND
        auth.uid() IN (
          SELECT u.id FROM auth.users u
          JOIN public.users pu ON u.id = pu.id
          WHERE pu.user_type = 'CAMPUS_STUDENT'
        ) AND
        (storage.foldername(name))[1] = 'submissions'
      );
    `;

    // Policy for users to read their own files
    const readOwnFilesPolicy = `
      CREATE POLICY "Users can read their own class activity files" ON storage.objects
      FOR SELECT USING (
        bucket_id = '${BUCKET_NAME}' AND
        auth.uid()::text = (storage.foldername(name))[2]
      );
    `;

    // Policy for teachers to read all files in their classes
    const teacherReadPolicy = `
      CREATE POLICY "Teachers can read class activity files" ON storage.objects
      FOR SELECT USING (
        bucket_id = '${BUCKET_NAME}' AND
        auth.uid() IN (
          SELECT u.id FROM auth.users u
          JOIN public.users pu ON u.id = pu.id
          WHERE pu.user_type IN ('CAMPUS_TEACHER', 'SYSTEM_ADMIN', 'CAMPUS_ADMIN')
        )
      );
    `;

    // Execute policies (Note: This would need to be run via SQL in practice)
    console.log('📝 RLS Policies to be applied:');
    console.log('1. Teacher upload policy');
    console.log('2. Student upload policy');
    console.log('3. Read own files policy');
    console.log('4. Teacher read policy');
    
    console.log('\n⚠️  Please run the following SQL commands in your Supabase SQL editor:');
    console.log('\n-- Enable RLS on storage.objects if not already enabled');
    console.log('ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;');
    console.log('\n-- Teacher upload policy');
    console.log(teacherUploadPolicy);
    console.log('\n-- Student upload policy');
    console.log(studentUploadPolicy);
    console.log('\n-- Read own files policy');
    console.log(readOwnFilesPolicy);
    console.log('\n-- Teacher read policy');
    console.log(teacherReadPolicy);

    console.log('\n✅ Class activities bucket setup completed!');
    console.log(`📁 Bucket name: ${BUCKET_NAME}`);
    console.log('🔒 Bucket is private with RLS policies');
    console.log('📏 File size limit: 50MB');
    console.log('📎 Allowed file types: PDF, Images, Audio, Video, Documents');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Run the setup
setupClassActivitiesBucket();
