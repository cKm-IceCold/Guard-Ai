import json
from rest_framework import serializers
from .models import Strategy
from .services import GeminiService

class StrategySerializer(serializers.ModelSerializer):
    checklist_items = serializers.JSONField(read_only=True)

    class Meta:
        model = Strategy
        fields = ['id', 'name', 'description', 'checklist_items', 'created_at']

    def create(self, validated_data):
        # 1. Get description
        description = validated_data.get('description', '')
        
        # 2. Call AI Service
        service = GeminiService()
        checklist_json_scring = service.generate_checklist(description)
        
        # 3. Parse JSON
        try:
            checklist = json.loads(checklist_json_scring)
        except json.JSONDecodeError:
            checklist = ["Error parsing AI response"]

        # 4. Save Strategy
        strategy = Strategy.objects.create(
            checklist_items=checklist,
            **validated_data
        )
        return strategy
