import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { SupabaseStorageService } from '@/lib/supabase/storage.service';
import { UserType } from '@prisma/client';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a teacher
    const userType = (session.user as any)?.userType;
    if (userType !== UserType.CAMPUS_TEACHER && userType !== UserType.TEACHER) {
      return NextResponse.json({ error: 'Only teachers can upload files' }, { status: 403 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'File type not supported. Please upload images, PDFs, or documents.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Supabase Storage
    const storageService = new SupabaseStorageService();
    const result = await storageService.uploadFile(buffer, file.name, {
      bucket: 'misc-content',
      folder: `teacher-assistant/${session.user.id}`,
      maxSize,
      allowedTypes,
      metadata: {
        uploadedBy: session.user.id,
        uploadedAt: new Date().toISOString(),
        originalName: file.name,
        contentType: file.type,
      }
    });

    return NextResponse.json({
      url: result.url,
      pathname: result.path,
      contentType: file.type,
      size: result.size,
    });

  } catch (error) {
    console.error('File upload error:', error);
    return NextResponse.json({ 
      error: 'Failed to upload file. Please try again.' 
    }, { status: 500 });
  }
}
