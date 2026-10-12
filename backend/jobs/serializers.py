

from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Candidate, Employer, JobListing, UserProfile, JobApplication
from django.contrib.auth.password_validation import validate_password

from .models import Resume

class JobListingSerializer(serializers.ModelSerializer):
    company = serializers.CharField(
        source="employer.company_name",
        read_only=True
    )
    
    employer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = JobListing
        fields = [
            "id",
            "employer",
            "company",
            "title",
            "description",
            "location",
            "salary",
            "job_type",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    role = serializers.ChoiceField(
        choices=UserProfile.ROLE_CHOICES
    )

    class Meta:
        model = User
        fields = ["username", "email", "password", "role"]

    def create(self, validated_data):
        role = validated_data.pop("role")

        user = User.objects.create_user(**validated_data)

        UserProfile.objects.create(
            user=user,
            role=role
        )

        if role == "Employer":
            Employer.objects.create(
                user=user,
                company_name=user.username
            )
        elif role == "Candidate":
            Candidate.objects.create(user=user)

        return user


class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = [
            "id",
            "job",
            "candidate",
            "resume",
            "status",
            "applied_at",
        ]
        read_only_fields = [
            "id",
            "candidate",
            "status",
            "applied_at",
        ]

   
    def validate(self, attrs):
        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return attrs

        candidate = getattr(request.user, "candidate", None)

        if candidate is None:
            raise serializers.ValidationError(
                "Only candidates can apply for jobs."
            )

        job = attrs.get("job")
        resume = attrs.get("resume")

        if job and job.status != "Open":
            raise serializers.ValidationError({
                "job": "You can only apply for open jobs."
            })

        if resume and resume.candidate_id != candidate.id:
            raise serializers.ValidationError({
                "resume": "You can only use your own resume."
            })

        if job and JobApplication.objects.filter(
            job=job,
            candidate=candidate
        ).exists():
            raise serializers.ValidationError({
                "job": "You have already applied for this job."
            })



        return attrs



class ResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resume
        fields = ["id", "candidate", "file", "uploaded_at"]
        read_only_fields = ["id", "candidate", "uploaded_at"]

    def validate_file(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError(
                "Resume size must be less than 5 MB."
            )

        allowed_extensions = [".pdf", ".doc", ".docx"]
        extension = value.name.lower().rsplit(".", 1)

        if len(extension) < 2 or f".{extension[-1]}" not in allowed_extensions:
            raise serializers.ValidationError(
                "Only PDF, DOC, and DOCX files are allowed."
            )

        return value



class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(
        required=True,
        write_only=True,
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
    )

    def validate_new_password(self, value):
        validate_password(value, user=self.context["request"].user)
        return value

class UserProfileUpdateSerializer(serializers.Serializer):
    first_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )
    last_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )
    email = serializers.EmailField(required=False)


class CandidateProfileUpdateSerializer(serializers.Serializer):
    phone = serializers.CharField(
        max_length=20,
        required=False,
        allow_blank=True,
    )
    skills = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    experience = serializers.IntegerField(
        required=False,
        min_value=0,
    )


class EmployerProfileUpdateSerializer(serializers.Serializer):
    company_name = serializers.CharField(
        max_length=255,
        required=False,
    )
    description = serializers.CharField(
        required=False,
        allow_blank=True,
    )
    website = serializers.URLField(
        required=False,
        allow_blank=True,
    )