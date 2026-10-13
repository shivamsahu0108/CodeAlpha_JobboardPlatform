from urllib import request

from django.shortcuts import render
from rest_framework.response import Response
from .models import JobApplication, JobListing, Notification, Resume, SavedJob
from .serializers import JobApplicationSerializer, JobListingSerializer, RegisterSerializer, ResumeSerializer, ChangePasswordSerializer, UserProfileUpdateSerializer,CandidateProfileUpdateSerializer, EmployerProfileUpdateSerializer
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.decorators import permission_classes
from .permissions import IsCandidate, IsEmployer
from django.db.models import Q
from django.http import JsonResponse
from .models import JobListing
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.conf import settings
from django.contrib.auth.password_validation import validate_password

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()
        return Response(
            {"message": "User registered successfully.",
             "username": user.username,
             "role": user.profile.role},
            status=status.HTTP_201_CREATED

        )
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["POST"])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(request, username=username, password=password)

    if user is not None:
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Login successful",
                "username": user.username,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
        )
    else:
        return Response(
            {"error": "Invalid Username or Password"},
            status=status.HTTP_401_UNAUTHORIZED,
        )

@api_view(["GET"])
@permission_classes([AllowAny])
def job_list(request):
    jobs = JobListing.objects.filter(status="Open").select_related("employer")

    search = request.query_params.get("search", "").strip()
    location = request.query_params.get("location", "").strip()
    job_type = request.query_params.get("job_type", "").strip()
    min_salary = request.query_params.get("min_salary")
    max_salary = request.query_params.get("max_salary")

    if search:
        jobs = jobs.filter(
            Q(title__icontains=search)
            | Q(description__icontains=search)
            | Q(employer__company_name__icontains=search)
        )
    if location:
        jobs = jobs.filter(location__icontains=location)
    if job_type:
        jobs = jobs.filter(job_type__iexact=job_type)

    try:
        if min_salary not in (None, ""):
            jobs = jobs.filter(salary__gte=int(min_salary))
        if max_salary not in (None, ""):
            jobs = jobs.filter(salary__lte=int(max_salary))
    except (TypeError, ValueError):
        return Response(
            {"detail": "Salary filters must be valid integers."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    paginator = PageNumberPagination()
    page = paginator.paginate_queryset(jobs.order_by("-created_at"), request)
    data = [
        {
            "id": job.id,
            "title": job.title,
            "company": job.employer.company_name,
            "description": job.description,
            "location": job.location,
            "salary": job.salary,
            "job_type": job.job_type,
            "status": job.status,
        }
        for job in page
    ]
    return paginator.get_paginated_response(data)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={"request": request},
    )

    if not serializer.is_valid():
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = request.user

    if not user.check_password(
        serializer.validated_data["old_password"]
    ):
        return Response(
            {"old_password": ["Incorrect current password."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.set_password(
        serializer.validated_data["new_password"]
    )
    user.save()

    return Response({
        "message": "Password changed successfully. Please log in again."
    })
@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email", "").strip()

    if not email:
        return Response(
            {"error": "Email is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    users = User.objects.filter(
        email__iexact=email,
        is_active=True,
    )

    for user in users:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        reset_link = (
            f"{settings.FRONTEND_URL}/reset-password/"
            f"?uid={uid}&token={token}"
        )

        send_mail(
            subject="Reset your Job Board password",
            message=(
                "You requested a password reset.\n\n"
                f"Open this link to reset your password:\n{reset_link}\n\n"
                "If you did not request this, ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

    return Response({
        "message": (
            "If an account exists for that email, "
            "password reset instructions will be sent."
        )
    })
@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    uid = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")

    if not uid or not token or not new_password:
        return Response(
            {"error": "uid, token, and new_password are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {"error": "Invalid password reset link."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not default_token_generator.check_token(user, token):
        return Response(
            {"error": "Invalid or expired password reset token."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        validate_password(new_password, user=user)
    except Exception as error:
        from django.core.exceptions import ValidationError

        if isinstance(error, ValidationError):
            return Response(
                {"new_password": list(error.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        raise

    user.set_password(new_password)
    user.save(update_fields=["password"])

    return Response({
        "message": "Password reset successfully. You can now log in."
    })

@api_view(["POST"])
@permission_classes([IsEmployer])
def create_job(request):
    serializer = JobListingSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(employer=request.user.employer)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["POST"])
@permission_classes([IsCandidate])
def apply_for_job(request, job_id):
    serializer = JobApplicationSerializer(data=request.data, context={'request': request})

    if serializer.is_valid():
        application = serializer.save(candidate=request.user.candidate)

        return Response(
            JobApplicationSerializer(
                application,
                context={'request': request}
                ).data,
            status=status.HTTP_201_CREATED
        )
    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET"])
@permission_classes([IsCandidate])
def my_applications(request):
    applications = JobApplication.objects.filter(
        candidate=request.user.candidate
    ).select_related("job", "resume")

    serializer = JobApplicationSerializer(
        applications,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsEmployer])
def employer_applications(request):
    applications = JobApplication.objects.filter(
        job__employer=request.user.employer
    ).select_related("job", "candidate", "resume")

    serializer = JobApplicationSerializer(
        applications,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)


@api_view(["PATCH"])
@permission_classes([IsEmployer])
def update_application_status(request, application_id):
    try:
        application = JobApplication.objects.get(
            id=application_id,
            job__employer=request.user.employer,
        )
    except JobApplication.DoesNotExist:
        return Response(
            {"error": "Application not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    new_status = request.data.get("status")

    valid_statuses = [
        choice[0]
        for choice in JobApplication.STATUS_CHOICES
    ]

    if new_status not in valid_statuses:
        return Response(
            {
                "error": "Invalid status.",
                "valid_statuses": valid_statuses,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    application.status = new_status
    application.save(update_fields=["status"])

    Notification.objects.create(
    recipient=application.candidate.user,
    message=(
        f"Your application for '{application.job.title}' "
        f"has been updated to: {new_status}."
    ),
)

    return Response({
        "message": "Application status updated successfully.",
        "application_id": application.id,
        "status": application.status,
    })

@api_view(["POST"])
@permission_classes([IsCandidate])
def upload_resume(request):
    serializer = ResumeSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(candidate=request.user.candidate)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )
    
@api_view(["GET"])
@permission_classes([IsCandidate])
def my_resumes(request):
    resumes = Resume.objects.filter(
        candidate=request.user.candidate
    ).order_by("-uploaded_at")

    serializer = ResumeSerializer(
        resumes,
        many=True,
        context={"request": request},
    )

    return Response(serializer.data)

@api_view(["DELETE"])
@permission_classes([IsCandidate])
def delete_resume(request, resume_id):
    try:
        resume = Resume.objects.get(
            id=resume_id,
            candidate=request.user.candidate,
        )
    except Resume.DoesNotExist:
        return Response(
            {"error": "Resume not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    resume.file.delete(save=False) 
    resume.delete()

    return Response(
        {"message": "Resume deleted successfully."},
        status=status.HTTP_204_NO_CONTENT,
    )

@api_view(["GET"])
@permission_classes([AllowAny])
@api_view(["GET"])
@permission_classes([AllowAny])
def job_detail(request, job_id):
    try:
        job = JobListing.objects.select_related(
            "employer"
        ).get(
            id=job_id,
            status="Open",
        )
    except JobListing.DoesNotExist:
        return Response(
            {"error": "Job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    data = {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "company": job.employer.company_name,
        "company_description": job.employer.description,
        "company_website": job.employer.website,
        "location": job.location,
        "salary": job.salary,
        "job_type": job.job_type,
        "status": job.status,
        "created_at": job.created_at,
    }

    return Response(data)

@api_view(["POST"])
@permission_classes([IsCandidate])
def save_job(request, job_id):
    try:
        job = JobListing.objects.get(id=job_id, status="Open")
    except JobListing.DoesNotExist:
        return Response(
            {"error": "Open Job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    saved_job, created = SavedJob.objects.get_or_create(
        candidate=request.user.candidate,
        job=job
    )
    if not created:
        return Response(
            {"message": "Job already saved."},
            status=status.HTTP_200_OK,
        )
    return Response(
        {"message": "Job saved successfully."},
        status=status.HTTP_201_CREATED,
    )

@api_view(["GET"])
@permission_classes([IsCandidate])
def my_saved_jobs(request):
    saved_jobs = SavedJob.objects.filter(
        candidate=request.user.candidate
    ).select_related("job", "job__employer").order_by("-saved_at")

    data = [
        {
            "saved_id": saved.id,
            "job_id": saved.job.id,
            "title": saved.job.title,
            "company": saved.job.employer.company_name,
            "location": saved.job.location,
            "salary": saved.job.salary,
            "job_type": saved.job.job_type,
            "saved_at": saved.saved_at,
        }
        for saved in saved_jobs
    ]

    return Response(data)

@api_view(["DELETE"])
@permission_classes([IsCandidate])
def delete_saved_job(request, saved_id):
    try:
        saved_job = SavedJob.objects.get(
            id=saved_id,
            candidate=request.user.candidate,
        )
    except SavedJob.DoesNotExist:
        return Response(
            {"error": "Saved job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )
    saved_job.delete()

    return Response(
        {"message": "Job removed from saved jobs."},
        status=status.HTTP_204_NO_CONTENT,
    )
@api_view(["GET"])
@permission_classes([IsEmployer])
def employer_dashboard(request):
    jobs = JobListing.objects.filter(
        employer=request.user.employer
    ).order_by("-created_at")

    data = []

    for job in jobs:
        data.append({
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "location": job.location,
            "salary": job.salary,
            "job_type": job.job_type,
            "status": job.status,
            "created_at": job.created_at,
            "applications_count": job.applications.count(),
        })

    return Response({
        "total_jobs": jobs.count(),
        "jobs": data,
    })

@api_view(["PATCH"])
@permission_classes([IsEmployer])
def edit_job(request, job_id):
    try:
        job = JobListing.objects.get(
            id=job_id,
            employer=request.user.employer,
        )
    except JobListing.DoesNotExist:
        return Response(
            {"error": "Job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    serializer = JobListingSerializer(
        job,
        data=request.data,
        partial=True,
    )

    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST,
    )

@api_view(["PATCH"])
@permission_classes([IsEmployer])
def close_job(request, job_id):
    try:
        job = JobListing.objects.get(
            id=job_id,
            employer=request.user.employer,
        )
    except JobListing.DoesNotExist:
        return Response(
            {"error": "Job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if job.status == "Closed":
        return Response(
            {"message": "This job is already closed."},
            status=status.HTTP_200_OK,
        )

    job.status = "Closed"
    job.save(update_fields=["status"])

    return Response({
        "message": "Job closed successfully.",
        "job_id": job.id,
        "status": job.status,
    })

@api_view(["PATCH"])
@permission_classes([IsEmployer])
def reopen_job(request, job_id):
    try:
        job = JobListing.objects.get(
            id=job_id,
            employer=request.user.employer,
        )
    except JobListing.DoesNotExist:
        return Response(
            {"error": "Job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if job.status == "Open":
        return Response(
            {"message": "This job is already open."},
            status=status.HTTP_200_OK,
        )

    job.status = "Open"
    job.save(update_fields=["status"])

    return Response({
        "message": "Job reopened successfully.",
        "job_id": job.id,
        "status": job.status,
    })

@api_view(["DELETE"])
@permission_classes([IsEmployer])
def delete_job(request, job_id):
    try:
        job = JobListing.objects.get(
            id=job_id,
            employer=request.user.employer,
        )
    except JobListing.DoesNotExist:
        return Response(
            {"error": "Job not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    job.delete()

    return Response({
        "message": "Job deleted successfully.",
        "status": status.HTTP_204_NO_CONTENT,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_notifications(request):
    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by("-created_at")

    data = [
        {
            "id": notification.id,
            "message": notification.message,
            "read": notification.read,
            "created_at": notification.created_at,
        }
        for notification in notifications
    ]

    return Response(data)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def mark_notification_as_read(request, notification_id):
    try:
        notification = Notification.objects.get(
            id=notification_id,
            recipient=request.user
        )
    except Notification.DoesNotExist:
        return Response(
            {"error": "Notification not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    notification.read = True
    notification.save(update_fields=["read"])

    return Response({
        "message": "Notification marked as read.",
        "notification_id": notification.id,
        "read": notification.read,
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unread_notification_count(request):
    count = Notification.objects.filter(
        recipient=request.user,
        read=False,
    ).count()

    return Response({
        "unread_count": count,
    })
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_profile(request):
    user = request.user

    profile_data = {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }

    if hasattr(user, "profile"):
        profile_data["role"] = user.profile.role

    if hasattr(user, "candidate"):
        candidate = user.candidate
        profile_data["phone"] = candidate.phone
        profile_data["skills"] = candidate.skills
        profile_data["experience"] = candidate.experience

    if hasattr(user, "employer"):
        employer = user.employer
        profile_data["company_name"] = employer.company_name
        profile_data["company_description"] = employer.description
        profile_data["company_website"] = employer.website

    return Response(profile_data)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_profile(request):
    user = request.user

    user_serializer = UserProfileUpdateSerializer(
        data=request.data,
        partial=True,
    )

    if not user_serializer.is_valid():
        return Response(
            user_serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    if "email" in user_serializer.validated_data:
        email = user_serializer.validated_data["email"]

        if User.objects.filter(email__iexact=email).exclude(
            id=user.id
        ).exists():
            return Response(
                {"email": ["This email is already in use."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if hasattr(user, "candidate"):
        profile_serializer = CandidateProfileUpdateSerializer(
            data=request.data,
            partial=True,
        )
        profile = user.candidate

    elif hasattr(user, "employer"):
        profile_serializer = EmployerProfileUpdateSerializer(
            data=request.data,
            partial=True,
        )
        profile = user.employer

    else:
        return Response(
            {"error": "Profile not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not profile_serializer.is_valid():
        return Response(
            profile_serializer.errors,
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save common user fields
    for field, value in user_serializer.validated_data.items():
        setattr(user, field, value)
    user.save()

    # Save role-specific fields
    for field, value in profile_serializer.validated_data.items():
        setattr(profile, field, value)
    profile.save()

    return Response({
        "message": "Profile updated successfully."
    })