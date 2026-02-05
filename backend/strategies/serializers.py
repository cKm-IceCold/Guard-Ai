import json
from rest_framework import serializers
from .models import Strategy, CustomRule
from .services import GeminiService

class CustomRuleSerializer(serializers.ModelSerializer):
    """
    Serializer for the CustomRule model.
    Handles the transformation of individual rule data, including pattern images.
    """
    class Meta:
        model = CustomRule
        fields = ['id', 'strategy', 'title', 'description', 'image_example', 'created_at']

class StrategySerializer(serializers.ModelSerializer):
    """
    Serializer for the Strategy model.
    Contains the core logic for AI-assisted strategy generation.
    When a strategy is created, it automatically calls Gemini to generate a checklist.
    """
    checklist_items = serializers.JSONField(read_only=True)
    custom_rules = CustomRuleSerializer(many=True, read_only=True)
    
    # Image fields for visual references (max 3)
    chart_image_1 = serializers.ImageField(required=False, allow_null=True)
    chart_image_2 = serializers.ImageField(required=False, allow_null=True)
    chart_image_3 = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Strategy
        fields = ['id', 'name', 'description', 'checklist_items', 'custom_rules', 
                  'chart_image_1', 'chart_image_2', 'chart_image_3', 'created_at']

    def create(self, validated_data):
        """
        Custom create method that triggers the AI checklist generation.
        1. Separates images from the text data.
        2. Sends the strategy description to Gemini.
        3. Parses the AI response into a structured JSON list.
        4. Saves the final strategy object with all components.
        """
        # Extract images before passing data to create
        chart_image_1 = validated_data.pop('chart_image_1', None)
        chart_image_2 = validated_data.pop('chart_image_2', None)
        chart_image_3 = validated_data.pop('chart_image_3', None)
        
        description = validated_data.get('description', '')
        
        # Initialize Gemini Service to 'distill' the user's strategy into a checklist
        service = GeminiService()
        checklist_json_string = service.generate_checklist(description)
        
        # Convert AI string response to a Python list
        try:
            checklist = json.loads(checklist_json_string)
        except json.JSONDecodeError:
            # Fallback if AI output is malformed
            checklist = ["Review your strategy description for clarity."]

        # Commit to database
        strategy = Strategy.objects.create(
            checklist_items=checklist,
            chart_image_1=chart_image_1,
            chart_image_2=chart_image_2,
            chart_image_3=chart_image_3,
            **validated_data
        )
        return strategy
    
    def update(self, instance, validated_data):
        """
        Handles partial updates, specifically managing image replacement
        without overwriting existing images if they aren't provided in the request.
        """
        if 'chart_image_1' in validated_data:
            instance.chart_image_1 = validated_data.pop('chart_image_1')
        if 'chart_image_2' in validated_data:
            instance.chart_image_2 = validated_data.pop('chart_image_2')
        if 'chart_image_3' in validated_data:
            instance.chart_image_3 = validated_data.pop('chart_image_3')
        
        return super().update(instance, validated_data)


